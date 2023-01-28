#!/usr/bin/env node
const converter = require('openapi-to-postmanv2')
process.env.SUPPRESS_NO_CONFIG_WARNING = 'y';
var configModule = require('config')
config = configModule.util.loadFileConfigs(__dirname + '/config/')
const fs = require('fs');
const merger=require('./lib/merger')

const program = require('commander')
program.version('1.0.0')
    .option('-s --service <service>', 'which service to convert')
    .option('-r --replace [repliaces]', 'comma split api name which will replace not merge')
    .parse(process.argv)


var serviceConfig = config[program.service]
var postmanFolder = serviceConfig.postman_path
var collectionName = serviceConfig.collection_name

//run update
update().catch(err => {
    console.error("run failed," + err)
})

//get swagger json & current collection
function getPostmanFile(file) {
    return JSON.parse(fs.readFileSync(postmanFolder + file, 'utf8'))
}



async function update() {
    var swaggerJson = getPostmanFile('/schemas/swagger.json')
    var converterInputData = {
        'type': 'json',
        'data': swaggerJson
    }

    //use postman tool convert to postman collection
    converter.convert(converterInputData, { 'folderStrategy': 'Tags' }, async (_a, res) => {
        if (res.result === false) {
            console.log('convert failed')
            console.log(res.reason)
            return
        }
        var convertedJson = res.output[0].data
        var savedCollection = getPostmanFile('/collections/' + collectionName + '.json')
        var mergedCollection=merger.merge(savedCollection,convertedJson)
        fs.writeFileSync(postmanFolder + '/collections/Collection.json', JSON.stringify(mergedCollection, null, 2))
        console.log('New collection created successfully!')
    })
}