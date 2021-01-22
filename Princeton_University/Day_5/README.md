<div class="fluid-row" id="header">
    <img src='../Assets/mapbiomas-icon.png' height='150' width='auto' align='right'>
    <h1 class="title toc-ignore">MapBiomas Princeton Course</h1>
    <h4 class="author"><em>Tasso Azevedo, Cesar Diniz, Luiz Cortinhas and João Siqueira</em></h4>
</div>

# Concepts of the Day

# 4. Integrating maps

A integração de mapas do mapbiomas é um processo que compila mapas elaborados por equipes especializadas em temas específicos. Esse processo resulta em um mapa com multiplas classes, com detalhamento de diversos temas e acurácia superior.

## 4.1 Acessing MapBiomas data

### 4.1.1 Defining asset ids

Vamos organizar nossos dados de uma forma estruturada para facilitar as coisas.

```javascript
// Assets folder
var assetsFolder = 'users/joaovsiqueira1/mapbiomas-course/integration-transitions';

// Atlantic Forest asset ids
var atlanticForestId2000 = assetsFolder + '/atlantic-forest-2000';
var atlanticForestId2019 = assetsFolder + '/atlantic-forest-2019';

// Pasture asset ids
var pastureId2000 = assetsFolder + '/pasture-2000';
var pastureId2019 = assetsFolder + '/pasture-2019';

// Coastal Zone asset ids
var coastalZoneId2000 = assetsFolder + '/coastal-zone-2000';
var coastalZoneId2019 = assetsFolder + '/coastal-zone-2019';

// Urban Infrastructure asset ids
var urbanId2000 = assetsFolder + '/urban-2000';
var urbanId2019 = assetsFolder + '/urban-2019';
```

### 4.1.2 Load images

Aqui nós estamos lendo as imagens.

```javascript
// Atlantic Forest images
var atlanticForest2000 = ee.Image(atlanticForestId2000);
var atlanticForest2019 = ee.Image(atlanticForestId2019);

// Pasture images
var pasture2000 = ee.Image(pastureId2000);
var pasture2019 = ee.Image(pastureId2019);

// Coastal Zone images
var coastalZone2000 = ee.Image(coastalZoneId2000);
var coastalZone2019 = ee.Image(coastalZoneId2019);

// Urban Infrastructure images
var urban2000 = ee.Image(urbanId2000);
var urban2019 = ee.Image(urbanId2019);
```

### 4.1.3 Add data to map

Vamos preparar o ambiente para a visualização dos dados

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

Agora, vamos entender um pouco nossos dados.

```javascript
// Add Atlantic Forest data to map
Map.addLayer(atlanticForest2000, visClassification, 'Atlantic Forest 2000');
Map.addLayer(atlanticForest2019, visClassification, 'Atlantic Forest 2019');

// Add Atlantic Forest data to map
Map.addLayer(coastalZone2000, visClassification, 'Coastal Zone 2000');
Map.addLayer(coastalZone2019, visClassification, 'Coastal Zone 2019');

// Add Atlantic Forest data to map
Map.addLayer(pasture2000, visClassification, 'Pasture 2000');
Map.addLayer(pasture2019, visClassification, 'Pasture 2019');

// Add Atlantic Forest data to map
Map.addLayer(urban2000, visClassification, 'Urban Infrastructure 2000');
Map.addLayer(urban2019, visClassification, 'Urban Infrastructure 2019');
```

Theme                           |Year 2000                               |Year 2019
:------------------------------:|:--------------------------------------:|:--------------------------------------:
**Atlantic Forest**             |![](./Assets/atlantic-forest-2000-2.png)|![](./Assets/atlantic-forest-2019-2.png)
**Coastal Zone**                |![](./Assets/coastal-zone-2000-2.png)   |![](./Assets/coastal-zone-2019-2.png)
**Pasture**                     |![](./Assets/pasture-2000-2.png)        |![](./Assets/pasture-2019-2.png)
**Urban Infrastructure**        |![](./Assets/urban-2000-2.png)          |![](./Assets/urban-2019-2.png)

## 4.2 Define an integration function

Vamos definir uma função para fazer a integração dos mapas

```javascript
/**
 * Integrated the mapbiomas thematic maps
 * 
 * @param {data} object {biome, pasture, coasta_zone, urban}
 *
 * @return {ee.Image} integrated
 */
var integrate = function(data){

    // Crosscuting themes classes
    var pasture = data.pasture.eq(15);
    var urban = data.urban.eq(24);
    var mangrove = data.coastal_zone.eq(5);
    var beach = data.coastal_zone.eq(23);

    // Biome classes
    var forest = data.biome.eq(3);
    var agricultureOrPasture = data.biome.eq(21);
    var nonNaturalForestFormation = data.biome.eq(13);
    var notVegetatedArea = data.biome.eq(25);
    var water = data.biome.eq(33);
    var rock = data.biome.eq(29);

    // Start an empty image
    var integrated = ee.Image(0);

    // Apply basic integration rules
    integrated = integrated.where(agricultureOrPasture, 21);
    integrated = integrated.where(pasture, 15);
    integrated = integrated.where(nonNaturalForestFormation, 13);
    integrated = integrated.where(forest, 3);
    integrated = integrated.where(water, 33);
    integrated = integrated.where(notVegetatedArea, 25);
    integrated = integrated.where(rock, 29);
    integrated = integrated.where(urban, 24);
    integrated = integrated.where(mangrove, 5);
    integrated = integrated.where(beach, 23);

    return integrated;
};
```

Agora, vamos aplicar a função `integrate()` e gerar os mapas integrados para os anos 2000 e 2019

```javascript
var data2000 = {
    'biome': atlanticForest2000,
    'pasture': pasture2000,
    'coastal_zone': coastalZone2000,
    'urban': urban2000,
};

var integrated2000 = integrate(data2000);

var data2019 = {
    'biome': atlanticForest2019,
    'pasture': pasture2019,
    'coastal_zone': coastalZone2019,
    'urban': urban2019,
};

var integrated2019 = integrate(data2019);
```

Vamos ver o resultado da nossa integração

```javascript
// Add integrated data to map
Map.addLayer(integrated2000, visClassification, 'Integrated 2000');
Map.addLayer(integrated2019, visClassification, 'Integrated 2019');
```

Theme                           |Year 2000                               |Year 2019
:------------------------------:|:--------------------------------------:|:------------------------------------:
**Integrated**                  |![](./Assets/integrated-2000.png)       |![](./Assets/integrated-2019.png)