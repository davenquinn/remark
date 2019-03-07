let debug = process.env.NODE_ENV !== 'production';
const path = require('path');
const nodeExternals = require('webpack-node-externals');

const frontendConfig = {
  //devtool: debug ? 'inline-source-map' : '',
  mode: debug ? 'development' : 'production',
  entry: {
    remark: __dirname + '/src/remark.js'
  },
  watch: false,
  output: {
    path: path.resolve(__dirname, 'build'),
    publicPath: '/assets',
    filename: debug ? 'remark.js' : 'remark.min.js'
  },
  target: 'web',
  module: {
    rules: [
      {
        loader: 'eslint-loader',
        enforce: 'pre',
        test: /\.js$/,
        exclude: /node_modules/
      },
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env'],
            plugins: ['@babel/plugin-proposal-class-properties']
          }
        }
      },
      {
        test: /\.scss$/,
        use: [
          {
            loader: 'style-loader',
            options: {
              attrs: {
                component: 'remark-defaults'
              }
            }
          },
          'css-loader', // translates CSS into CommonJS
          'sass-loader' // compiles Sass to CSS
        ]
      },
      {
        test: /\.css/,
        use: [
          'style-loader', // creates style nodes from JS strings
          'css-loader' // translates CSS into CommonJS
        ]
      }
    ]
  },
  optimization: {
    minimize: !debug
  },
  devServer: {
    contentBase: 'build/',
    watchContentBase: true,
    open: true
  }
};

const backendConfig = {
  mode: debug ? 'development' : 'production',
  entry: {
    remark: __dirname + '/src/remark-node.js'
  },
  target: 'node',
  watch: false,
  output: {
    path: path.resolve(__dirname, 'build'),
    library: 'remark',
    libraryTarget: 'umd',
    filename: 'remark.node.js'
  },
  module: {
    rules: [
      {
        loader: 'eslint-loader',
        enforce: 'pre',
        test: /\.js$/,
        exclude: /node_modules/
      },
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env'],
            plugins: ['@babel/plugin-proposal-class-properties']
          }
        }
      }
    ]
  },
  optimization: {
    minimize: false
  },
  externals: [nodeExternals()]
};

module.exports = [ backendConfig, frontendConfig ];
