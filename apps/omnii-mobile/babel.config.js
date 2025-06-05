module.exports = function (api) {  
    api.cache(true);  
    return {  
      presets: ['babel-preset-expo'],  
      plugins: [  
  //       ['nativewind/babel', {   
  //         mode: 'compileOnly',  
  //         exclude: /node_modules/   
  //       }],  
        'react-native-reanimated/plugin', // Must be last  
      ],  
    };  
  };