const path = require('path');
const absolute_path = file => path.resolve(__dirname, file[0]);

const HtmlWebpackPlugin = require("html-webpack-plugin");
const CleanWebpackPlugin = require('clean-webpack-plugin');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CopyWebpackPlugin = require('copy-webpack-plugin');
const GitRevisionPlugin = require('git-revision-webpack-plugin');
const gitInfo = new GitRevisionPlugin();

const isTravis = 'TRAVIS' in process.env && 'CI' in process.env;

module.exports = (env, argv) => {
    const isProduction = argv.mode === 'production';
    const output_folder = isProduction ? absolute_path`dist/production` : absolute_path`dist/development`;

    return {
            mode: isProduction ? 'production' : 'development',
            entry: [ absolute_path`src/index.tsx` ],
			output: {
				path: output_folder,
				filename: "[name]-[hash].js",
				chunkFilename: "[name]-[hash].js"
			},
			resolve: {
				extensions: ['.webpack.js', '.web.js', '.ts', '.tsx', '.js', '.jsx', '.json']
			},

            // Enable sourcemaps in external files in development builds.
            devtool: !isProduction ? "source-map" : false,

            module: {
                rules: [
                    // All output '.js' files will have any sourcemaps re-processed by 'source-map-loader'.
                    { enforce: "pre", test: /\.js$/, loader: "source-map-loader" },
                    //! Takes all included SCSS files, compiles them and places them into a CSS file.
                    { test: /\.scss$/,
                      use: [
                        MiniCssExtractPlugin.loader,
                        "css-loader",
                        "sass-loader"
                      ]
                    },
                    {
                      test: /\.tsx?$/,
                      use: 'ts-loader',
                      exclude: /node_modules|dist/
                    },
                    //! Takes all referenced font files and puts them in the font folder
                    {
                        test: /\.(woff(2)?|ttf|eot|svg)(\?v=\d+\.\d+\.\d+)?$/,
                        use: [{
                            loader: 'file-loader',
                            options: {
                                name: '[name].[ext]',
                                outputPath: 'fonts/'
                            }
                        }]
                    }
                ]
            },
            plugins: [
                new MiniCssExtractPlugin({
                    filename: "[name].[chunkhash].css",
                    chunkFilename: "[id].css"
                }),
                new HtmlWebpackPlugin({
                    template: 'index.html',
                    inject: 'body',
                    templateParameters: {
                        title: 'LibFirm Visual Debugger',
                        description: 'A visual debugger for the libfirm rust wrapper',
                        isProduction: isProduction,
                        version: JSON.stringify(gitInfo.version()),
                        commitHash: JSON.stringify(gitInfo.commithash()),
                        // in travis, this will return 'HEAD', since a specific commit
                        // instead of a branch is checked out. Therefore check TRAVIS_BRANCH
                        // first.
                        branch: JSON.stringify(isTravis && process.env.TRAVIS_BRANCH ? process.env.TRAVIS_BRANCH : gitInfo.branch()),
                        datetime: JSON.stringify((new Date).toISOString()),
                        travisBuildId: JSON.stringify(process.env.TRAVIS_BUILD_ID || null),
                    }
                }),
                new CopyWebpackPlugin([
                  'js/'
                ])
            ].concat(isProduction ? 
                [new CleanWebpackPlugin([output_folder], {
                        verbose: true
                })] : []
            ),

optimization: {
    splitChunks: {
        chunks: 'all',
    },
    runtimeChunk: true,
}
    }
};
