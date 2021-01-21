<div class="fluid-row" id="header">
    <img src='../Assets/mapbiomas-icon.png' height='150' width='auto' align='right'>
    <h1 class="title toc-ignore">MapBiomas Princeton Course</h1>
    <h4 class="author"><em>Tasso Azevedo, Cesar Diniz, Luiz Cortinhas and João Siqueira</em></h4>
</div>

# Concepts of the Day

# 3. Post-classification

## 3.1 Spatial Filter
### 3.1.1 Load data

```javascript
// The asset name of classification data
var classificationId = 'users/joaovsiqueira1/mapbiomas-course/spatial-temporal-filter/amazonia-2019';

// Load image classification
var classification = ee.Image(classificationId);

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

// Add image to map
Map.addLayer(classification, visClassification, 'Classification 2019');
```
![load-classification](./Assets/load-classification.png)
[Link](https://code.earthengine.google.com/6dc68d4352fe954eef137c45bd452cee)

### 3.1.2 Use the mapbiomas spatial filter code
Essa etapa não é um processo simples de se fazer, por isso teremos um código um pouco mais avançado aqui. O filtro espacial tem o objetivo de reclassificar pequenos grupos de pixels isolados usando a informação dos pixels vizinhos. Estes pixels isolados, em geral, passam pelo processo de rotulagem do classificador, mas por estarem num padrão espacial disperso acabam por não refletir o resultado esperado. O propósito desta técnica não é alterar o dado de classificação de uma forma significativa, mas trazer uma melhoria sútil ao mapa final. Vamos estudar o código abaixo.

```javascript
/**
 * Classe de pos-classificação para reduzir ruídos na imagem classificada
 * 
 * @param {ee.Image} image [eeObjeto imagem de classificação]
 *
 * @example
 * var image = ee.Image("aqui vem a sua imagem");
 * var filterParams = [
 *     {classValue: 1, maxSize: 3},
 *     {classValue: 2, maxSize: 5}, // o tamanho maximo que o mapbiomas está usado é 5
 *     {classValue: 3, maxSize: 5}, // este valor foi definido em reunião
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
     * Método para reclassificar grupos de pixels de mesma classe agrupados
     * @param  {list<dictionary>} filterParams [{classValue: 1, maxSize: 3},{classValue: 2, maxSize: 5}]
     * @return {ee.Image}  Imagem classificada filtrada
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
```
[Link](https://code.earthengine.google.com/07a35e19beced17bad2935048a006f07)

Agora vamos ver como se usa o código do MapBiomas.

```javascript
// Set a list of spatial filter parameters
// classValue is the representative number of a class and maxSize is the maximum
// size of pixels in a group that will be reclassified
var filterParams = [
    {classValue: 3, maxSize: 5},
    {classValue: 15, maxSize: 5}, 
    {classValue: 33, maxSize: 5}, 
    {classValue: 19, maxSize: 5},
];

var pc = new PostClassification(classification);

var filtered = pc.spatialFilter(filterParams);

// Add image to map
Map.addLayer(filtered.reproject('EPSG:4326', null, 30), visClassification, 'Filtered 2019');
```
<div align=center>
    <caption>
        <h4><strong>Classification before spatial filter</strong></h4>
    </caption>
    <p align="center">
        <img src="./Assets/spatial-filter-before.png"/>
    </p>
    <caption>
        <h4><strong>Classification after spatial filter</strong></h4>
    </caption>
    <p align="center">
        <img src="./Assets/spatial-filter-after.png"/>
    </p>
</div>

[Link](https://code.earthengine.google.com/1237c86837a94fcc549d9d3e1adf59bb)

### 3.1.3 Export the filtered classification

Executamos esse procedimento para todos os mapas anuais do MapBiomas. Utilizamos algumas técnicas para otimizar o tempo de exportação das imagens. Algumas delas podem ser encontradas no nosso github.

```javascript
// Export the filtered classification to your asset
Export.image.toAsset({
    image: filtered, 
    description: 'filtered-2019', 
    assetId: 'filtered-2019', 
    pyramidingPolicy: {'.default': 'mode'},
    region: classification.geometry(), 
    scale: 30, 
    maxPixels: 1e13
});
```

## 3.2 Temporal Filter

Assim como o filtro espacial, o filtro temporal tem como objetivo reclassificar dados usando as informações de seus vizinhos. No entanto, o filtro temporal usa o pixel de uma data no passado e outro em uma data no futuro do pixel em análise. Neste exercício vamos usar uma série temporal de imagens classificadas para a coleção 5 do MapBiomas.

### 3.2.1 Acessing pre-processed MapBiomas data
:heavy_exclamation_mark: Start a new script.

```javascript
// List of years used in mapbiomas collection 5
var years = [
    '1985', '1986', '1987', '1988', '1989', '1990', '1991', '1992',
    '1993', '1994', '1995', '1996', '1997', '1998', '1999', '2000',
    '2001', '2002', '2003', '2004', '2005', '2006', '2007', '2008',
    '2009', '2010', '2011', '2012', '2013', '2014', '2015', '2016',
    '2017', '2018', '2019'
];

// The classification name prefix in my asset structure
var classificationPrefix = 'users/joaovsiqueira1/mapbiomas-course/spatial-temporal-filter/amazonia-';

// Iterate over years list, concatenate de prefix to year and load as an ee.Image
var classificationList = years.map(
    function(year){
        return ee.Image(classificationPrefix + year).rename('classification_'+ year);
    }
);

// Now see the result
print(classificationList);
```

[Link](https://code.earthengine.google.com/d125276d7ecd0d578bc4b4cd8cfa84ef)

### 3.2.2 Converting the list of images to multiband image
Esta etapa do código vai nos ajudar a interagir com as classificações anuais mais facilmente
```javascript
// Create a image collection from the classification list
var classificationCollection = ee.ImageCollection.fromImages(classificationList);

// Prints a image collection
print('classificationCollection:', classificationCollection);

// Convert the classification collection to an image where each year is a band
var classificationMultiBand = classificationCollection.toBands();

print('classificationMultiBand:', classificationMultiBand);
```
[Link](https://code.earthengine.google.com/ceeaabf7945a82312d99b191271ee473)

### 3.2.3 Apply a simple temporal filter rule
Vamos usar algumas regras simples no nosso filtro temporal. Neste exercício vamos olhar um pixel anterior e um posterior ao ano 2018. Veja como podemos acessar facilmente as imagens dos anos 2017, 2018 e 2019.

```javascript
// Select the data from 2017, 2018 and 2019.
var class2017 = classificationMultiBand.select(['32_classification_2017']);
var class2018 = classificationMultiBand.select(['33_classification_2018']);
var class2019 = classificationMultiBand.select(['34_classification_2019']);
```

Agora precisamos criar algumas regras usando algebra de mapas. Vamos focar em três classes: `pasture`, `forest formation` and `agriculture`.

**Class ids:**
- Forest formation: 3
- Pasture: 15
- Agriculture: 19

See the mapbiomas documentation for more information about the legend.

```javascript
// Find pixels where is forest in 2017 and pasture in 2018 and forest in 2019
var rule1 = class2017.eq(3).and(class2018.eq(15)).and(class2019.eq(3));

// Find pixels where is pasture in 2017 and agriculture in 2018 and pasture in 2019
var rule2 = class2017.eq(15).and(class2018.eq(19)).and(class2019.eq(15));

// Reclassify 2018 noise using rule 1 and 2
var filtered2018 = class2018
    .where(rule1, 3)
    .where(rule2, 15);
```

Precisamos do nosso conjunto de parâmentros de visualização mais uma vez.

```javascript
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
```

Agora adicionamos ao mapa as classificações do ano 2018 antes e depois do filtro temporal.

```javascript
// Add images to map
Map.addLayer(class2018, visClassification, 'Classification 2018');
Map.addLayer(filtered2018, visClassification, 'Filtered 2018');
```
<div align=center>
    <caption>
        <h4><strong>Classification before temporal filter</strong></h4>
    </caption>
    <p align="center">
        <img src="./Assets/temporal-filter-before.png"/>
    </p>
    <caption>
        <h4><strong>Classification after temporal filter</strong></h4>
    </caption>
    <p align="center">
        <img src="./Assets/temporal-filter-after.png"/>
    </p>
</div>

[Link](https://code.earthengine.google.com/4bb33fe86977177b94e5b3ddac15e0f8)

[Previous: Day 3 - Classification using Random Forest](https://github.com/mapbiomas-brazil/mapbiomas-training/tree/main/Princeton_University/Day_3/README.md) | 
[Next: Day 5 - Identifying Land Use and Land Cover Changes + Applications](https://github.com/mapbiomas-brazil/mapbiomas-training/tree/main/Princeton_University/Day_5/README.md)