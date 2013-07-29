module.exports = function(grunt) {
  // Project configuration.
    
  var project = {
    files: ['src/gm-library.js', 'src/csscolorparser.js']
  }
    
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    uglify: {
      options: {
        banner: '/*! Copyright 2013 Adobe Systems Inc.;\n' +
                  '* Licensed under the Apache License, Version 2.0 (the "License");\n' +
                  '* you may not use this file except in compliance with the License.\n' +
                  '* You may obtain a copy of the License at\n\n' +
                  '* http://www.apache.org/licenses/LICENSE-2.0\n\n' +
                  '* Unless required by applicable law or agreed to in writing, software\n' +
                  '* distributed under the License is distributed on an "AS IS" BASIS,\n' +
                  '* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.\n' +
                  '* See the License for the specific language governing permissions and\n' +
                  '* limitations under the License.\n'+
                  '*/\n\n' +
                  '/*\n' +
                  'Gradient Maps support\n' +
                  'Author: Alan Greenblatt (blatt@adobe.com, @agreenblatt, blattchat.com)\n' +
                  '*/\n'
      },
      
      build: {
        src: '<%= concat.dist.dest %>',
        dest: '<%= pkg.name %>.min.js'
      }
    },
    
    concat: {
      dist: {
        src: project.files,
        dest: '<%= pkg.name %>.js'
      }
    },
    
    watch: {
      js: {
        files: project.files,
        tasks: ['concat', 'uglify']
      }
    }

  });
  
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-watch');

  grunt.registerTask('default', ['concat', 'uglify']);
  grunt.registerTask('build', ['concat', 'uglify']);
};
