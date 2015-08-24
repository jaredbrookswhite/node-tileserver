Node and Mapnik based Tileserver
-------------

This is a first draft of a more robust tile server that takes advantage of styles and sources generated in mapbox studio.
To run the sample, run the following code.
```
  git clone https://github.com/jaredbrookswhite/node-tileserver.git
  cd node-tileserver
  npm install
  node index.js
```
navigate to http://localhost:8000/?map=sample

-------
I will soon add postgis support, but for now, any file based geospatial data, and any style made in mapbox studio, is supported.
Simply: 
- Build your style in mapbox.
- Move any geodata into your .tm2source folder and any image used in your cartocss into your .tm2 folder. 
- Remove the path to your .tm2source folder in your .tm2/project.xml file, leaving only the folder name. 
- Remove the path to your geodata file in any Datasource tag your .tm2source/data.xml file, leaving only the file name. 
- Move both your .tm2source folder and .tm2 folder into the ./node-tileserver/maps/ directory.
