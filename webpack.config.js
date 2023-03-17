const path = require("path");
const fs = require("fs");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const appDirectory = fs.realpathSync(process.cwd());
const webpack = require("webpack");

module.exports = {
    entry: path.resolve(appDirectory, "src/app.ts"), //path to the main .ts file
    output: {
        filename: "js/bundleName.js", //name for the js file that is created/compiled in memory
        clean: true,
    },
    resolve: {
        extensions: [".tsx", ".ts", ".js"],
    },
    devServer: {
        host: "0.0.0.0",
        port: 8083,
        static: path.resolve(appDirectory, "public"), //tells webpack to serve from the public folder
        hot: true,
        https: {
            key: fs.readFileSync("./certs/ssl.key"),
            cert: fs.readFileSync("./certs/ssl.cert"),
            //ca: fs.readFileSync('./cert/ssl.ca'),
        },
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: "ts-loader",
                exclude: /node_modules/,
            },
            {
                test: /\.js$/,
                enforce: "pre",
                use: ["source-map-loader"],
            },
        ],
    },
    plugins: [
        new webpack.ProvidePlugin({
            process: "process/browser",
        }),
        new HtmlWebpackPlugin({
            inject: true,
            template: path.resolve(appDirectory, "public/index.html"),
        }),
    ],
    mode: "development",
};
