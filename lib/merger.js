const pinyin=require('pinyin')
const chineseRegex=/\p{Unified_Ideograph}+/ug;

//merge exist api and folder id
function handleIdMerge(jsonData) {
    jsonData.item.forEach(folder => {
        mergeId(folder)
    })
}

//merge exist api and folder id
//folder may be just an api or a folder
function mergeId(folder) {
    if (folder.item == null) {
        //此时是单个api
        if (folder._postman_id != null) {
            folder.id = folder._postman_id
        }
        return
    }
    folder.item.forEach(api => {
        mergeId(api)
    })

}

//build Map<folderName,Map<apiName,api>> 
//for saved collection, may api also be folder, but for swagger generated
//there is only two level, so just ignore more level folder
function buildCollectionMap(jsonData) {
    apiInfo = new Map()
    apiInfo.set('x-s2p-root', new Map())
    apiInfo.set('x-s2p-folder', new Map())
    jsonData.item.forEach(folder => {
        if (folder.item == null) {
            //root api
            rootApiInfo = apiInfo.get('x-s2p-root')
            rootApiInfo.set(folder.name, folder)
            apiInfo.set('x-s2p-root', rootApiInfo)
            return
        }
        //save folder info also
        folderMap = apiInfo.get('x-s2p-folder')
        folderMap.set(folder.name, folder)
        folder.item.forEach(api => {
            folderInfo = apiInfo.get(folder.name) || new Map()
            folderInfo.set(api.name, api)
            apiInfo.set(folder.name, folderInfo)
        })
    })
    var apiObj = new Map()
    apiInfo.forEach((value, key) => {
        apiObj.set(key, Object.fromEntries(value))
    })
    // return Object.fromEntries(apiObj)
    return apiInfo
}

function merge(savedJsonData, newJsonData) {
    newApiInfo = buildCollectionMap(newJsonData)
    var mergedJsonData = {}
    mergedJsonData = Object.assign({}, savedJsonData);
    mergedJsonData.item = []
    savedJsonData.item.forEach(folder => {
        if (folder.item == null) {
            //root api
            newApiInfo.get('x-s2p-root').delete(folder.name)
            //already exist, save old
            mergedJsonData.item.push(folder)
            return
        }

        newFolder = Object.assign({}, folder);
        newFolder.item = []
        mergedJsonData.item.push(newFolder)
        folder.item.forEach(api => {
            if (newApiInfo.has(folder.name)) {
                newApiInfo.get(folder.name).delete(api.name)
            }
            newFolder.item.push(api)
        })
        //process current folder new add api
        if (newApiInfo.has(folder.name)) {
            newApiInfo.get(folder.name).forEach((api, name) => {
                newFolder.item.push(api)
            })
        }
        newFolder.item.sort(compare)
        newApiInfo.delete(folder.name)
        newApiInfo.get('x-s2p-folder').delete(folder.name)
    })
    //process new add root api
    newApiInfo.get('x-s2p-root').forEach((api, name) => {
        mergedJsonData.item.push(api)
    })
    newApiInfo.delete('x-s2p-root')
    //process new add folder
    newApiInfo.get('x-s2p-folder').forEach((folder, name) => {
        folder.item.sort(compare)
        mergedJsonData.item.push(folder)
    })
    mergedJsonData.item.sort(compare)
    handleIdMerge(mergedJsonData)
    return mergedJsonData;
}

function compare(a, b) {
    var nameA = a.name;
    var nameB = b.name;
    //replace name with pinyin
    nameA=nameA.replace(chineseRegex,replacer);
    nameB=nameB.replace(chineseRegex,replacer)
    return nameA.localeCompare(nameB)
}

function replacer(macthString,offset, origin){
    var pinyinData=pinyin(macthString,{style: pinyin.STYLE_NORMAL});
    //pinyin data is [[],[],[]] format
    var result=[];
    pinyinData.forEach(pininArr=>{
        result.push(pininArr[0]);
    });
    return result.join("");
}

module.exports = { merge }