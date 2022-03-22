// List of years used in mapbiomas collection 5
var years = [
    '1985', '1986', '1987', '1988', '1989', '1990', '1991', '1992',
    '1993', '1994', '1995', '1996', '1997', '1998', '1999', '2000',
    '2001', '2002', '2003', '2004', '2005', '2006', '2007', '2008',
    '2009', '2010', '2011', '2012', '2013', '2014', '2015', '2016',
    '2017', '2018', '2019'
];

// The classification name prefix in my asset structure
var classificationPrefix = 'users/joaovsiqueira1/mapbiomas-training/spatial-temporal-filter/amazonia-';

// Iterate over years list, concatenate de prefix to year and load as an ee.Image
var classificationList = years.map(
    function (year) {
        return ee.Image(classificationPrefix + year).rename('classification_' + year);
    }
);

// Now see the result
print(classificationList);

// Create a image collection from the classification list
var classificationCollection = ee.ImageCollection.fromImages(classificationList);

// Prints a image collection
print('classificationCollection:', classificationCollection);

// Convert the classification collection to an image where each year is a band
var classificationMultiBand = classificationCollection.toBands();

print('classificationMultiBand:', classificationMultiBand);

// Select the data from 2017, 2018 and 2019.
var class2017 = classificationMultiBand.select(['32_classification_2017']);
var class2018 = classificationMultiBand.select(['33_classification_2018']);
var class2019 = classificationMultiBand.select(['34_classification_2019']);

// Find pixels where is forest in 2017 and pasture in 2018 and forest in 2019
var rule1 = class2017.eq(3).and(class2018.eq(15)).and(class2019.eq(3));

// Find pixels where is pasture in 2017 and agriculture in 2018 and pasture in 2019
var rule2 = class2017.eq(15).and(class2018.eq(19)).and(class2019.eq(15));

// Reclassify 2018 noise using rule 1 and 2
var filtered2018 = class2018
    .where(rule1, 3)
    .where(rule2, 15);

// import the mapbiomas palettes module and get the 'classification5' color scheme
var palette = require('users/mapbiomas/modules:Palettes.js').get('classification5');

print(palette);

// Set a visualization parameter
var visClassification = {
    'min': 0,
    'max': 45,
    'palette': palette,
    'format': 'png'
};

// Add images to map
Map.addLayer(class2018, visClassification, 'Classification 2018');
Map.addLayer(filtered2018, visClassification, 'Filtered 2018');

/**
 * Calculate the class area
 * @param {ee.Image} img, {number} classID
 * @return {ee.Feature} feature with indentified metadata
*/
var areaPerClass = function (img, classID) {
    var area = img
        .rename('area')
        .eq(classID)
        .multiply(ee.Image.pixelArea())
        .reduceRegion({
            reducer: ee.Reducer.sum(),
            geometry: img.geometry(),
            scale: 30,
            maxPixels: 1e13
        });

    return ee.Feature(null, {
        'classId': classID,
        'area_m2': area.get('area')
    });
};

var area_3 = areaPerClass(filtered2018, 3);
var area_12 = areaPerClass(filtered2018, 15);
var area_15 = areaPerClass(filtered2018, 15);
var area_19 = areaPerClass(filtered2018, 19);
var area_25 = areaPerClass(filtered2018, 25);
var area_33 = areaPerClass(filtered2018, 33);

// This cast is important to export as a table
var areaCollection = ee.FeatureCollection([
    area_3,
    area_12,
    area_15,
    area_19,
    area_25,
    area_33
]);

print(areaCollection);

//Exporting...
Export.table.toDrive({
    collection: areaCollection,
    description: 'area_per_class_2018',
    fileNamePrefix: 'area_per_class_2018',
    folder: 'map_stats',
    fileFormat: 'csv',
});
