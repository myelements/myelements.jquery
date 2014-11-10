var gulp = require("gulp");
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var join = require("path").join;
var baseDir = join("lib", "client");

var srcFiles = [
  require.resolve('socket.io-client/socket.io.js'),
  join(baseDir, "lib", "ejs", "ejs_0.9_alpha_1_production.js"),
  join(baseDir, "lib", "page.js", "page.js"),
  join(baseDir, "lib", "localforage", "localforage.js"),
  join(baseDir, "lib", "debug", "debug.js"),
  join(baseDir, "lib", "jquery.ui.widget", "jquery.ui.widget.js"),
  join(baseDir, "myelements.jquery.js")
];

var dstFile = "myelements.jquery.dist.js";
var dstMinifiedFile = "myelements.jquery.dist.min.js";
var dstDirectory = "./dist";

gulp.task('default', function() {
  gulp.src(srcFiles)
    .pipe(concat(dstFile))
    .pipe(gulp.dest(dstDirectory))

  //minified 

  gulp.src(srcFiles)
    .pipe(concat(dstMinifiedFile))
    .pipe(uglify())
    .pipe(gulp.dest(dstDirectory))
});