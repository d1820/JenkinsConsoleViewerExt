// generated on 2016-08-31 using generator-chrome-extension 0.6.0
import gulp from "gulp";
import gulpLoadPlugins from "gulp-load-plugins";
import del from "del";
import runSequence from "run-sequence";
import less from "gulp-less";
import sourcemaps from "gulp-sourcemaps";

const $ = gulpLoadPlugins();

gulp.task("extras", () => {
  return gulp.src([
    "app/*.*",
    "app/fonts/**",
    "!app/scripts.babel",
    "!app/*.json",
    "!app/*.html"
  ], { base: "app",
      dot: true
    }).pipe(gulp.dest("dist"));
});

function lint(files, options) {
  return () => {
    return gulp.src(files)
      .pipe($.eslint(options))
      .pipe($.eslint.format());
  };
}

gulp.task("lint", lint("app/scripts.babel/**/*.js", {
  env: {
    es6: true
  }
}));

gulp.task("images", () => {
  return gulp.src("app/images/**/*")
    .pipe($.if($.if.isFile, $.cache($.imagemin({
      progressive: true,
      interlaced: true,
      // don"t remove IDs from SVGs, they are often used
      // as hooks for embedding and styling
      svgoPlugins: [{ cleanupIDs: false }]
    }))
      .on("error", function (err) {
        console.log(err);
        this.end();
      })))
    .pipe(gulp.dest("dist/images"));
});

gulp.task("html", () => {
  return gulp.src("app/*.html")
    .pipe($.useref({ searchPath: [".tmp", "app", "."] }))
    .pipe($.sourcemaps.init())
    .pipe($.if("*.js", $.uglify()))
    .pipe($.if("*.css", $.cleanCss({ compatibility: "*" })))
    .pipe($.sourcemaps.write())
    .pipe($.if("*.html", $.htmlmin({ removeComments: true, collapseWhitespace: true })))
    .pipe(gulp.dest("dist"));
});

gulp.task("chromeManifest", () => {
  //this looks though manifest and pulls out file references and moves them to dist
  return gulp.src("app/manifest.json")
    .pipe($.chromeManifest({
      buildnumber: true,
      exclude: [
        "key"
      ],
      background: {
        target: "scripts/background.js",
        exclude: [
          "scripts/chromereload.js"
        ]
      }
    }))
    .pipe($.if("*.css", $.cleanCss({ compatibility: "*" })))
    .pipe($.if("*.js", $.sourcemaps.init()))
    .pipe($.if("*.js", $.uglify()))
    .pipe($.if("*.js", $.sourcemaps.write(".")))
    .pipe(gulp.dest("dist"));
});

gulp.task("babel", () => {
  return gulp.src("app/scripts.babel/**/*.js")
    .pipe($.babel({
      presets: ["es2015"]
    }))
    .pipe(gulp.dest("app/scripts"));
});

gulp.task("babel:build", () => {
  return gulp.src("app/scripts.babel/**/*.js")
    .pipe($.babel({
      presets: ["es2015"]
    }))
    .pipe(gulp.dest("dist/scripts"));
});

gulp.task("clean", del.bind(null, [".tmp", "dist"]));

gulp.task("watch", [
  "lint",
  "babel",
  "less:local",
  "html"], () => {
    $.livereload.listen();

    gulp.watch([
      "app/*.html",
      "app/scripts/**/*.js",
      "app/images/**/*",
      "app/styles/**/*"
    ]).on("change", $.livereload.reload);

    gulp.watch("app/scripts.babel/**/*.js", [
      "lint",
      "babel"]);
    gulp.watch("app/less/**/*.less", ["less:local"]);
  });

gulp.task("size", () => {
  return gulp.src("dist/**/*").pipe($.size({ title: "build", gzip: true }));
});

gulp.task("less:local", function () {
  gulp.src("app/less/*.less")
    .pipe(sourcemaps.init())
    .pipe(less())
    .pipe(sourcemaps.write())
    .pipe(gulp.dest("app/styles"));
});

gulp.task("less:build", function () {
  gulp.src("app/less/*.less")
    .pipe(sourcemaps.init())
    .pipe(less())
    .pipe(sourcemaps.write())
    .pipe(gulp.dest("dist/styles"));
});

gulp.task("package", function () {
  const manifest = require("./dist/manifest.json");
  return gulp.src("dist/**")
    .pipe($.zip("JenkinsPlusExt-" + manifest.version + ".zip"))
    .pipe(gulp.dest("package"));
});

gulp.task("build", (cb) => {
  runSequence(
    "lint",
    "babel:build",
    "chromeManifest",
    [
      "less:build",
      "html",
      "images",
      "extras"],
    "size", cb);
});

gulp.task("default", ["clean"], cb => {
  runSequence("build", cb);
});
