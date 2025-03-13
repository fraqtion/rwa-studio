// This configuration is to build `ownable.js`, which is the js file that's
// loaded in each Ownable iframe.
//
// Webpack for the React App is controlled by the `react-script` library. To
// customize it, see `craco.config.js`.
//

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  mode: 'production',
  entry: './src/ownable.ts',
  devtool: 'source-map',
  output: {
    path: path.resolve(__dirname, 'public'),
    filename: 'ownable.js',
    asyncChunks: false,
    library: {
      type: 'global',
    },
  },
  module: {
    rules: [
      {
        test: /\.ts?$/,
        loader: 'babel-loader',
        options: {
          presets: ['@babel/preset-typescript'],
        },
        sideEffects: false,
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  performance: {
    maxEntrypointSize: 512000,
    maxAssetSize: 512000,
  },
};
