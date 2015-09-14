# tilejar
#### a Node.js and Mapnik based Tileserver

This is a draft of a more robust tile server that takes advantage of styles and sources generated in mapbox studio.
To run the sample, first, install some software.

[![Build Status](https://travis-ci.org/jaredbrookswhite/tilejar.svg?branch=dev)](https://travis-ci.org/jaredbrookswhite/tilejar)

  - Install postgresql and postgis, I recommend [Boundless' opengeo suite](http://boundlessgeo.com/solutions/opengeo-suite/)
  - Install the GDAL library
  
```
  git clone https://github.com/jaredbrookswhite/tilejar.git
  cd tilejar
  npm install
  cd scripts

  psql -U postgres -f setupdb1.sql
```
  - You need to copy the two xml files from the scripts directory to your postgres directory, find it by typing 
  SHOW data_directory; 
  in psql. 
  - Now its time to get the data.
```
  wget ftp://ftp2.census.gov/geo/tiger/TGRGDB14/tlgdb_2014_a_us_roads.gdb.zip
  unzip tlgdb_2014_a_us_roads.gdb.zip
  ogr2ogr -f "PostgreSQL" PG:"dbname=geodata user=postgres" tlgdb_2014_a_us_roads.gdb  
  
  wget ftp://ftp2.census.gov/geo/tiger/TIGER2015/STATE/tl_2015_us_state.zip
  unzip tl_2015_us_state.zip
  ogr2ogr -f "PostgreSQL" PG:"dbname=geodata user=postgres" tl_2015_us_state.shp -skipfailures -overwrite -nln state
  
  psql -U postgres -f setupdb2.sql
  cd ..
  node index.js
```

navigate to [the server](http://localhost:8000/?map=roads)

-------


