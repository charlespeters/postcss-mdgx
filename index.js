const path = require('path')
const fs = require('fs')
const postcss = require('postcss')
const nano = require('cssnano')

var analyzer = require('./lib/analyzer')
var newParams = require('./lib/params')
var template = require('./lib/template')
var fileWriter = require('./lib/fileWriter')
var markdownParser = require('./lib/markdown')
var syntaxHighlighter = require('./lib/syntaxHighlight')
var colorPalette = require('./lib/colorPalette')

module.exports = postcss.plugin('postcss-mdgx', function(opts) {
  opts = opts || {}

  analyzer.setModules(syntaxHighlighter, markdownParser)

  var func = function(root, result) {
    let outputCSS = root.toString()

    var resultOpts = result.opts || {}
    try {
      var params = newParams(root, opts, resultOpts)
    } catch (err) {
      throw err
    }

    var maps = analyzer.analyze(root, opts)
    var palette = colorPalette.parse(root.toString())
    var promise = syntaxHighlighter
        .execute({
          src: params.src,
          tmplStyle: params.style,
          stylePath: require.resolve('highlight.js/styles/github.css')
        })
        .then(styles => {
          var html = template.rendering(maps, styles, {
            project: params.project,
            showCode: params.showCode,
            tmpl: params.template,
            colorPalette: palette,
            outputCSS: outputCSS
          })

          fileWriter.write(params.dest, html)

          let fxname = path.relative(process.cwd(), params.dest)

          if (!opts.silent) {
            console.log(`\nSuccessfully created style guide at ${fxname}!`)
          }

          return root
        })
        .catch(err => {
          console.error(`Generate Err:  ${err}`)
          return root
        })

    return promise
  }
  return func
})
