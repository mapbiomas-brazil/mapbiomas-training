// The asset name of classification data
var classificationId = 'users/joaovsiqueira1/mapbiomas-training/spatial-temporal-filter/amazonia-2019';

// Load image classification
var classification = ee.Image(classificationId);

// import the mapbiomas palettes module and get the 'classification5' color scheme
var palette = require('users/mapbiomas/modules:Palettes.js').get('classification6');

print(palette);

// Set a visualization parameter
var visClassification = {
    'min': 0,
    'max': 49,
    'palette': palette,
    'format': 'png'
};

// Add image to map
Map.addLayer(classification, visClassification, 'Classification 2019');

/**
 * Post-classification spatial filter struct
 * 
 * @param {ee.Image} image [eeObject classification image]
 *
 * @example
 * var image = ee.Image("your image path goes here");
 * var filterParams = [
 *     {classValue: 1, maxSize: 3},
 *     {classValue: 2, maxSize: 5}, // Mapbiomas maximum Size
 *     {classValue: 3, maxSize: 5}, 
 *     {classValue: 4, maxSize: 3},
 *     ];
 * var pc = new PostClassification(image);
 * var filtered = pc.spatialFilter(filterParams);
 */
var PostClassification = function (image) {

    this.init = function (image) {

        this.image = image;

    };

    var majorityFilter = function (image, params) {

        params = ee.Dictionary(params);
        var maxSize = ee.Number(params.get('maxSize'));
        var classValue = ee.Number(params.get('classValue'));

        // Generate a mask from the class value
        var classMask = image.eq(classValue);

        // Labeling the group of pixels until 100 pixels connected
        var labeled = classMask.mask(classMask).connectedPixelCount(maxSize, true);

        // Select some groups of connected pixels
        var region = labeled.lt(maxSize);

        // Squared kernel with size shift 1
        // [[p(x-1,y+1), p(x,y+1), p(x+1,y+1)]
        // [ p(x-1,  y), p( x,y ), p(x+1,  y)]
        // [ p(x-1,y-1), p(x,y-1), p(x+1,y-1)]
        var kernel = ee.Kernel.square(1);

        // Find neighborhood
        var neighs = image.neighborhoodToBands(kernel).mask(region);

        // Reduce to majority pixel in neighborhood
        var majority = neighs.reduce(ee.Reducer.mode());

        // Replace original values for new values
        var filtered = image.where(region, majority);

        return filtered.byte();

    };

    /**
     * Reclassify small blobs of pixels  
     * @param  {list<dictionary>} filterParams [{classValue: 1, maxSize: 3},{classValue: 2, maxSize: 5}]
     * @return {ee.Image}  Filtered Classification Image
     */
    this.spatialFilter = function (filterParams) {

        var image = ee.List(filterParams)
            .iterate(
                function (params, image) {
                    return majorityFilter(ee.Image(image), params);
                },
                this.image
            );

        this.image = ee.Image(image);


        return this.image;

    };

    this.init(image);

};

// Set a list of spatial filter parameters
// classValue is the representative number of a class and maxSize is the maximum
// size of pixels in a group that will be reclassified
var filterParams = [
    { classValue: 3, maxSize: 5 },
    { classValue: 15, maxSize: 5 },
    { classValue: 33, maxSize: 5 },
    { classValue: 19, maxSize: 5 },
];

var pc = new PostClassification(classification);

var filtered = pc.spatialFilter(filterParams);

// Add image to map
Map.addLayer(filtered.reproject('EPSG:4326', null, 30), visClassification, 'Filtered 2019');

// Export the filtered classification to your asset
Export.image.toAsset({
    image: filtered,
    description: 'filtered-2019',
    assetId: 'filtered-2019',
    pyramidingPolicy: { '.default': 'mode' },
    region: classification.geometry(),
    scale: 30,
    maxPixels: 1e13
});