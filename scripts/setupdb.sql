create database geodata;
use geodata;
drop table map_sources;
drop table map_styles;
create table map_sources(
id serial,
source_name varchar(50) unique not null,
markup xml not null
);
create table map_styles(
id serial,
style_name varchar(50) unique not null,
markup xml not null
);
insert into map_sources values(
	default,
	'roads',
    XMLPARSE(DOCUMENT convert_from(
        pg_read_binary_file('data.xml'), 'UTF8'))
        );
insert into map_styles values(
	default,
	'roads',
    XMLPARSE(DOCUMENT convert_from(
        pg_read_binary_file('project.xml'), 'UTF8'))
        );
		