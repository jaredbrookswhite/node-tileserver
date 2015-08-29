# tilejar
#### a Node.js and Mapnik based Tileserver

This is a draft of a more robust tile server that takes advantage of styles and sources generated in mapbox studio.
To run the sample, first, install some software.

  - Install postgresql and postgis, I recommend [Boundless' opengeo suite](http://boundlessgeo.com/solutions/opengeo-suite/)
  
```
  git clone https://github.com/jaredbrookswhite/tilejar.git
  cd tilejar
  npm install
  cd scripts
  psql -f setupdb.sql
  
  wget ftp://ftp2.census.gov/geo/tiger/TGRGDB14/tlgdb_2014_a_us_roads.gdb.zip
  unzip tlgdb_2014_a_us_roads.gdb.zip
  ogr2ogr -f "PostgreSQL" PG:"dbname=geodata user=postgres" tlgdb_2014_a_us_roads.gdb  
  
  cd ..
  node index.js
```

navigate to [the server](http://localhost:8000/?map=sample)

-------


