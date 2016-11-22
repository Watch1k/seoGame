'use strict';

var gulp = require('gulp'),
	sass = require('gulp-sass'),
	sourcemaps = require('gulp-sourcemaps'),
	postcss = require('gulp-postcss'),
	concat = require('gulp-concat'),
	merge = require('merge-stream'),
	streamqueue = require('streamqueue'),
	include = require('gulp-include'),
	autoprefixer = require('autoprefixer'),
	rigger = require('gulp-rigger'),
	spritesmith = require('gulp.spritesmith'),
	jade = require('gulp-pug2'),
	jadelint = require('gulp-pug-lint'),
	browserSync = require("browser-sync"),
	consolidate = require("gulp-consolidate"),
	rimraf = require('rimraf'),
	htmlhint = require("gulp-htmlhint"),
	cmq = require('gulp-combine-mq'),
	zip = require('gulp-zip'),
	htmlbeautify = require('gulp-html-beautify'),
	rename = require('gulp-rename'),
	svgstore = require('gulp-svgstore'),
	svgmin = require('gulp-svgmin'),
	cheerio = require('gulp-cheerio'),
	gutil = require('gulp-util'),
	include = require('gulp-include'),
	cssmin = require('gulp-cssmin'),
	reload = browserSync.reload;

// IE 8 opacity
var opacity = function (css, opts) {
	css.eachDecl(function (decl) {
		if (decl.prop === 'opacity') {
			decl.parent.insertAfter(decl, {
				prop: '-ms-filter',
				value: '"progid:DXImageTransform.Microsoft.Alpha(Opacity=' + (parseFloat(decl.value) * 100) + ')"'
			});
		}
	});
};

var src = {
	root: 'src',
	sass: 'src/sass',
	js: 'src/js',
	img: 'src/img',
	lib: 'src/lib',
	svg: 'src/img/svg',
	assets: 'src/assets'
};

var dest = {
	root: 'build',
	html: 'build',
	css: 'build/css',
	js: 'build/js',
	img: 'build/img'
};

// jade
gulp.task('jade', function () {
	return gulp.src(['src/jade/**/*.pug', '!src/jade/includes/**/*.pug'])
		.pipe(jadelint())
		.pipe(jade())
		.pipe(htmlbeautify({indent_size: 2}))
		.pipe(gulp.dest('build/'));
});

gulp.task('sass', function () {
	var processors = [
		opacity,
		autoprefixer({
			browsers: ['last 100 versions'],
			cascade: false
		})
	];

	return streamqueue({objectMode: true},
		gulp.src(src.root + '/css/*.css'),
		gulp.src('src/sass/*.sass')
			.pipe(sourcemaps.init())
			.pipe(sass({outputStyle: 'nested'}).on('error', sass.logError))
			.pipe(postcss(processors))
			.pipe(rigger())
			.pipe(sourcemaps.write('./'))
			.pipe(gulp.dest('build/css'))
	)
		.pipe(concat('screen.css'))
		// .pipe(cssmin())
		.pipe(gulp.dest('build/css'));
});

// sprite
gulp.task('sprite', function () {
	var spriteData = gulp.src(src.img + '/icons/*.png')
		.pipe(spritesmith({
			imgName: 'icons.png',
			cssName: '_sprite.sass',
			imgPath: '../img/icons.png',
			cssFormat: 'sass',
			padding: 4,
			// algorithm: 'top-down',
			cssTemplate: src.assets + '/sprite.template.mustache'
		}));
	spriteData.img
		.pipe(gulp.dest(dest.img));
	spriteData.css
		.pipe(gulp.dest(src.sass + '/lib'));
});

// svg sprite
gulp.task('svg-sprite', function () {
	return gulp.src(src.svg + '/*.svg')
		.pipe(svgmin({
			js2svg: {
				pretty: true
			},
			plugins: [{
				removeDesc: true
			}, {
				cleanupIDs: true
			}, {
				mergePaths: false
			}]
		}))
		.pipe(rename({prefix: 'icon-'}))
		.pipe(svgstore({inlineSvg: true}))
		.pipe(rename({basename: 'sprite'}))
		.pipe(cheerio({
			run: extractDataFromIcons,
			parserOptions: {xmlMode: true}
		}))
		.pipe(gulp.dest(dest.img));
});

function extractDataFromIcons($, file) {
	// get data about each icon
	var symbols = $('svg > symbol:not(.original)');
	var data = symbols.map(function () {
		var $this = $(this);
		var size = $this.attr('viewBox').split(' ').splice(2);
		return {
			name: $this.attr('id'),
			height: size[1],
			ratio: Math.ceil((size[0] / size[1]) * 10) / 10
		};
	}).get();

	// remove attributes to make possible applying these styles via css
	symbols.each(function () {
		var ind = false;
		if ($(this).attr('id').indexOf('-original') > -1) {
			ind = true;
		}
		$(this)
			.children()
			.removeAttr('stroke')
			.removeAttr('stroke-width')
			.removeAttr('opacity');
		if (!ind) {
			$(this)
				.children()
				.not('[fill="currentColor"]')
				.removeAttr('fill');
		}
	});

	// create scss file with icon dimensions
	gulp.src('src/assets/_sprite.scss')
		.pipe(consolidate('lodash', {
			icons: data
		}))
		.pipe(rename({basename: '_svg-sprite'}))
		.pipe(gulp.dest('src/sass/lib'));

	// create preview
	gulp.src('src/assets/sprite.html')
		.pipe(consolidate('lodash', {
			icons: data
		}))
		.pipe(gulp.dest('build'));
}

// html includes
gulp.task('html', function () {
	gulp.src('src/*.html')
		.pipe(rigger())
		.pipe(htmlhint())
		.pipe(htmlhint.reporter())
		.pipe(gulp.dest('build/'))
		.pipe(reload({
			stream: true
		}));
});

// js includes
gulp.task('js', function () {
	gulp.src('src/js/**/*.js')
		.pipe(include())
		.pipe(rigger())
		.pipe(gulp.dest('build/js/'))
		.pipe(reload({
			stream: true
		}));
});

// copy
gulp.task('copy', function () {
	gulp.src('src/*.php')
		.pipe(gulp.dest('build/'));
	gulp.src('src/img/**')
		.pipe(gulp.dest('build/img/'));
	gulp.src('src/fonts/*.*')
		.pipe(gulp.dest('build/css/fonts/'));
	gulp.src('src/css/**')
		.pipe(gulp.dest('build/css/lib/'));
	gulp.src('src/video/*.*')
		.pipe(gulp.dest('build/video/'));
});

// delete app
gulp.task('del', function (cb) {
	rimraf('./build', cb);
	gulp.src(src.root);
});

// make zip-file
gulp.task('zip', function () {
	return gulp.src('build/**/*')
		.pipe(zip('build.zip'))
		.pipe(gulp.dest(''));
});

// web server
gulp.task('browser-sync', function () {
	browserSync({
		server: {
			baseDir: dest.root,
			directory: true,
			// index: 'index.html'
		},
		files: [dest.html + '/*.html', dest.css + '/*.css', dest.js + '/*.js'],
		port: 8080,
		notify: false,
		ghostMode: false,
		online: true,
		open: false
	});
});

// watch
gulp.task('watch', function () {
	gulp.watch('src/jade/**/*.pug', ['jade']);
	gulp.watch(src.sass + '/**/*', ['sass']);
	gulp.watch('src/js/**/*.js', ['js']);
	gulp.watch('src/img/**/*', ['sprite', 'copy']);
	gulp.watch('src/img/svg/**/*', ['svg-sprite', 'copy']);
	gulp.watch(src.img + '/icons/*.png', ['sprite']);
});


// 'gulp' task
gulp.task('default', ['watch', 'browser-sync'], function () {
	gulp.src(dest.root);
	gulp.watch('build/**/*.html').on('change', reload);
});

// 'gulp build' task
gulp.task('build', ['jade', 'html', 'sprite', 'svg-sprite', 'copy', 'js', 'sass'], function () {
	gulp.src(dest.root);
});
