\c geodata;
drop table tenn_roads;
SELECT 
 r.wkb_geometry as geom 
into tenn_roads
 FROM roads r, state s
 WHERE 
 s.ogc_fid = 36 and
 st_within (r.wkb_geometry,s.wkb_geometry);
ALTER TABLE tenn_roads ADD column gid serial;
SELECT UpdateGeometrySRID('tenn_roads','geom',4326);
CREATE INDEX idx_tenn_roads ON tenn_roads USING gist(geom);
vacuum analyze tenn_roads;
vacuum;