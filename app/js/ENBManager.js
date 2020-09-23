let ENBProfiles = require(__dirname + '/config/enb.json');

function loadENB(ENB) {
    document.body.style.cursor = "progress";
    document.body.innerHTML = "LOADING NEW ENB";

    //Do actual ENB switching here

    ENBProfiles.currentENB = ENB
    fs.writeFileSync(__dirname + '/config/enb.json', JSON.stringify(ENBProfiles, null, 2))
    location.reload()
}

function configureENB(ENB) {
    require('child_process').exec(`start "" "${__dirname + "/ENB Profiles/" + ENBProfiles.profiles[ENB].name}"`)
}

function deleteENB(ENB) {
    dialogs.confirm(`Delete the "${ENBProfiles.profiles[ENB].name}" ENB profile?`, ok =>
    {
        if(ok){
            //Remove file cache
            if(ENB == ENBProfiles.currentENB) {

                //Remove files from Skyrim directory

                ENBProfiles.currentENB = 0
            }
            delete ENBProfiles.profiles[ENB]
            for(i=ENB;i < Object.keys(ENBProfiles.profiles).length;i++)
            {
                ENBProfiles.profiles[i] = ENBProfiles.profiles[i+1]
                delete ENBProfiles.profiles[i+1]
            }
            fs.writeFileSync(__dirname + '/config/enb.json', JSON.stringify(ENBProfiles, null, 2))
            dialogs.alert("Profile deleted.", ok => {location.reload()})
        } else {
            dialogs.alert("Profile not deleted.", ok => {location.reload()})
        }
    })
}

function addENB() {
    let newENBName
    dialogs.prompt('Enter a name for your new ENB profile.', ok => {
        if(ok){
            newENBName = ok
            fs.mkdir(__dirname + "/ENB Profiles/" + newENBName, (err) =>
            {
                if(err)
                {
                    dialogs.alert(err + "\nFOLDER COULD NOT BE CREATED", ok => {location.reload()})
                }
                else
                {
                    dialogs.alert('A folder has been created for your new ENB profile. After you hit ok, a explorer window will open the folder. Please copy the ENB files for this preset over, then hit okay again!', ok => 
                    {
                        require('child_process').exec(`start "" "${__dirname + "/ENB Profiles/" + newENBName}"`);
                        dialogs.alert('Paste your files in, then hit ok', ok =>
                        {
                            fs.readdir(`${__dirname + "/ENB Profiles/" + newENBName}`, (err,files) =>
                            {
                                if(err)
                                {
                                    dialogs.alert(err + "\nFOLDER COULD NOT BE READ", ok => {location.reload()})
                                }
                                else
                                {
                                    let ENB = Object.keys(ENBProfiles.profiles).length
                                    let newKey = JSON.parse(`{"name":"${newENBName}","files":""}`)
                                    ENBProfiles.profiles[ENB] = newKey;
                                    console.log(ENBProfiles);
                                        for (file of files)
                                        {
                                            ENBProfiles.profiles[ENB].files += file
                                            console.log(file)
                                        }
                                        fs.writeFileSync(__dirname + '/config/enb.json', JSON.stringify(ENBProfiles, null, 2))
                                        dialogs.alert("Profile created!", ok =>
                                        {
                                            location.reload()
                                        })
                                }
                            })
                        })
                    })
                }
            })
        }
    })

    
}