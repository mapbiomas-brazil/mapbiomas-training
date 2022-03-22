// Image asset id
var imageId = "users/joaovsiqueira1/mapbiomas-training/mosaic-2020";

// Load as an image
var mosaic = ee.Image(imageId);

// prints the collection structure
print('Mosaic:', mosaic);

// Set the visualization parameters
var visParams = {
    bands: ['SR_B6_median', 'SR_B5_median', 'SR_B4_median'],
    gain: [0.08, 0.06, 0.2]
};

// Add image to map
Map.addLayer(mosaic, visParams, 'Mosaic');

// Zoom into the image
// Map.centerObject(mosaic, 10);

// Create a function to collect random point inside the polygons
var generatePoints = function (polygons, nPoints) {

    // Generate N random points inside the polygons
    var points = ee.FeatureCollection.randomPoints(polygons, nPoints);

    // Get the class value propertie
    var classValue = polygons.first().get('class');

    // Iterate over points and assign the class value
    points = points.map(
        function (point) {
            return point.set('class', classValue);
        }
    );

    return points;
};

// Collect random points inside your polygons
var vegetationPoints = generatePoints(vegetation, 100);

var notVegetationPoints = generatePoints(notVegetation, 100);

var waterPoints = generatePoints(water, 50);

// Merge all samples into a featureCollection
var samples = vegetationPoints.merge(notVegetationPoints).merge(waterPoints);

print(samples);

Map.addLayer(samples.filter(ee.Filter.eq('class', 1)), { color: '#005b2b' }, 'samples');
Map.addLayer(samples.filter(ee.Filter.eq('class', 2)), { color: '#fff104' }, 'samples');
Map.addLayer(samples.filter(ee.Filter.eq('class', 3)), { color: '#1488ff' }, 'samples');

// Collect the spectral information to get the trained samples
var trainedSamples = mosaic.reduceRegions({
    'collection': samples,
    'reducer': ee.Reducer.first(),
    'scale': 30,
});

trainedSamples = trainedSamples.filter(ee.Filter.notNull(['SR_B2_max']));

print(trainedSamples);

// Set up the Random Forest classifier
var classifier = ee.Classifier.smileRandomForest({
    'numberOfTrees': 50
});

// Training the classifier
classifier = classifier.train({
    'features': trainedSamples,
    'classProperty': 'class',
    'inputProperties': [
        'SR_B2_max',
        'SR_B2_median',
        'SR_B2_min',
        'SR_B3_max',
        'SR_B3_median',
        'SR_B3_min',
        'SR_B4_max',
        'SR_B4_median',
        'SR_B4_min',
        'SR_B5_max',
        'SR_B5_median',
        'SR_B5_min',
        'SR_B6_max',
        'SR_B6_median',
        'SR_B6_min',
        'SR_B7_max',
        'SR_B7_median',
        'SR_B7_min',
        'evi_max',
        'evi_median',
        'evi_min',
        'ndvi_max',
        'ndvi_median',
        'ndvi_min',
        'ndwi_max',
        'ndwi_median',
        'ndwi_min',
    ]
});

// Run the Random Forest classifier
var classification = mosaic.classify(classifier);

// Add classification to map
Map.addLayer(classification, {
    'min': 0,
    'max': 3,
    'palette': ['#ffffff', '#005b2b', '#fff104', '#1488ff'],
    'format': 'png'
},
    'classification'
);

// Export the classification to your asset
Export.image.toAsset({
    image: classification,
    description: 'classification-2020',
    assetId: 'classification-2020',
    pyramidingPolicy: { '.default': 'mode' }, // use mode for classification data
    region: classification.geometry(),
    scale: 30,
    maxPixels: 1e13
});