/**
 * Create a Landsat 8 surface reflectance collection, filter by location and date
 */

// Landsat 8 SR collection id
var collectionId = "LANDSAT/LC08/C01/T1_SR";

// Create a collection filtering by ROI and date
var collection = ee.ImageCollection(collectionId)
    .filterBounds(roi)
    .filterDate('2020-01-01', '2020-12-31');

// prints the collection structure
print('Initial collection:', collection);

// Filter images less than 50% of cloud cover
collection = collection
    .filterMetadata('CLOUD_COVER', 'less_than', 50);

// prints the collection structure
print('Images less than 50% of cloud cover:', collection);

var bandNames = ['B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'pixel_qa'];

// Select bands of interest
collection = collection.select(bandNames);

// prints the collection structure
print('Images with selected bands:', collection);

var visParams = {
    bands: ['B6', 'B5', 'B4'],
    gain: [0.08, 0.06, 0.2]
};

Map.addLayer(collection, visParams, 'collection');

/**
 * @name
 *      cloudMasking
 * @description
 *      Removes clouds and shadow using the pixel_qa band
 * @argument
 *      ee.Image with pixel_qa band
 * @returns
 *      ee.Image without clouds
 */
var cloudMasking = function (image) {

    var qaBand = image.select(['pixel_qa']);

    var cloud = qaBand.bitwiseAnd(Math.pow(2, 5)).not();
    var shadow = qaBand.bitwiseAnd(Math.pow(2, 3)).not();

    image = image.updateMask(cloud);
    image = image.updateMask(shadow);

    return image;
};

var collectionWithoutClouds = collection.map(cloudMasking);

Map.addLayer(collectionWithoutClouds, visParams, 'collection without clouds');

/**
 * @name
 *      computeNDVI
 * @description
 *      Calculates NDVI index
 */
var computeNDVI = function (image) {

    var exp = '( b("B5") - b("B4") ) / ( b("B5") + b("B4") )';

    var ndvi = image.expression(exp).rename("ndvi");

    return image.addBands(ndvi);
};

/**
 * @name
 *      computeNDWI
 * @description
 *      Calculates NDWI index
 */
var computeNDWI = function (image) {

    var exp = 'float(b("B5") - b("B6"))/(b("B5") + b("B6"))';

    var ndwi = image.expression(exp).rename("ndwi");

    return image.addBands(ndwi);
};

/**
 * @name
 *      computeEVI
 * @description
 *      Calculates EVI index
 */
var computeEVI = function (image) {

    var exp = '2.5 * ((b("B5") - b("B4")) / (b("B5") + 6 * b("B4") - 7.5 * b("B2") + 1))';

    var evi = image.expression(exp).rename("evi");

    return image.addBands(evi);

};

// For each image, apply the functions computeNDVI, computeNDWI and computeEVI.
var collectionWithIndexes = collectionWithoutClouds
    .map(computeNDVI)
    .map(computeNDWI)
    .map(computeEVI);

// Sets a visualization parameter object to NDVI data
var visNdvi = {
    bands: ['ndvi'],
    min: 0,
    max: 1,
    palette: 'ff0000,ffff00,00aa00',
    format: 'png'
};

Map.addLayer(collectionWithIndexes, visNdvi, 'collection with indexes');

print('collection with indexes:', collectionWithIndexes);

// Generate median, minimum and maximum mosaics.
var median = collectionWithIndexes.reduce(ee.Reducer.median());
var minimum = collectionWithIndexes.reduce(ee.Reducer.min());
var maximum = collectionWithIndexes.reduce(ee.Reducer.max());

// Merges the median, minimum and maximum mosaics
var mosaic = median.addBands(minimum).addBands(maximum);

// Sets a visualization parameter object to NDVI median
var visNdvi = {
    bands: ['ndvi_median'],
    min: 0,
    max: 1,
    palette: 'ff0000,ffff00,00aa00',
    format: 'png'
};

// Sets false color visualization parameter object
var visFalseColor = {
    bands: ['B6_median', 'B5_median', 'B4_median'],
    gain: [0.08, 0.06, 0.2],
    gamma: 0.85
};

// Add median mosaic to map
Map.addLayer(mosaic, visFalseColor, 'False color');
Map.addLayer(mosaic, visNdvi, 'NDVI median mosaic');

// Export the mosaic to your asset
Export.image.toAsset({
    image: mosaic,
    description: 'mosaic-2020',
    assetId: 'mosaic-2020',
    pyramidingPolicy: { '.default': 'mean' },
    region: roi,
    scale: 30,
    maxPixels: 1e13
});