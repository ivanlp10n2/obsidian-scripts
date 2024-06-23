// convert note name into a serialized date and put into a folderr
// from (01-Jan-2023 -> 2023/01/2023-01-01/2023-01-01)

const throwError = (message) => {
    const error = new Error(message)
    console.error(message, error)
    throw error
}

const dep = (templateApi) => {
    console.log(`loading dependencies for file [${templateApi.file}]`)
    return {
        filepath: templateApi.file.path,
        filename: templateApi.file.title,
        rename: async (newName) => renameFile(newName, templateApi),
        newDateFormat: (day, month, year) => buildNewPathfile(day, month, year),
    }
}
const renameFile = async (newName, tp) => {
    console.log(`renaming [${tp.file.title}] to [${newName}]`)
    await tp.file.move(newName)
}
const buildNewPathfile = (day, month, year) => {
    const monthToNumberStr = (month) => {
        const mapOfMonths = {
            'Jan': '01',
            'Feb': '02',
            'Mar': '03',
            'Apr': '04',
            'May': '05',
            'Jun': '06',
            'Jul': '07',
            'Aug': '08',
            'Sep': '09',
            'Oct': '10',
            'Nov': '11',
            'Dec': '12',
        }
        if (!mapOfMonths[month]) {
            throwError(`we're not moving [${filename}]`)
        }
        return mapOfMonths[month]
    }
    const monthNumber = monthToNumberStr(month)
    const fullDay = `${year}-${monthNumber}-${day}`
    const fullPath = `${year}/${monthNumber}/${fullDay}/${fullDay}`
    return fullPath
}

const buildFlowBranches = (dependencies) => {
    return {
        filenameWrongFormat: (filename) => {
            console.log(`filename is not correct format [${filename}]`)
            throwError(`we're not moving [${filename}]`)
        },
        filenameAlreadyFormatted: (filename) => {
            console.log(`filename is already formatted [${filename}]`)
            throwError(`we're not moving [${filename}]`)
        },
        filenameDoesMatch: async (day, month, year, rootFolderPath) => {
            const newName = `${rootFolderPath}/${dependencies.newDateFormat(day, month, year)}`
            console.log(`renaming [${dependencies.filename}] to [${newName}]`)
            await dependencies.rename(newName)
        }
    }
}
const printDependencies = (dependencies) => {
    console.log(`dependencies loaded:\n${JSON.stringify(dependencies)}`)
}

const alreadyCorrectFormat = (month) => {
    return month.length == 2
}
async function rename_format_daily_file (tp, dailyFolder) {
    if (tp == undefined) throwError("templater dependency is not provided as argument") 
    if (dailyFolder == undefined) throwError("dailyFolder is not provided as argument")
    const dependencies = dep(tp)
    printDependencies(dependencies)
    const branchs = buildFlowBranches(dependencies)
    const run = async () => {
        const filename = dependencies.filename
        const [day, month, year] = filename.split('-')
        const isInvalid = (day == undefined) || (month == undefined) || (year == undefined)

        console.log("hey it's me. They didn't return the application")
        if (isInvalid) branchs.filenameWrongFormat(filename)
        if (alreadyCorrectFormat(month)) branchs.filenameAlreadyFormatted(filename)

        console.log("what is this") //let formattedDate = tp.date.now("YYYY/MM/YYYY-MM-DD", 0, dateStr, "DD-MMM-YYYY")

        branchs.filenameDoesMatch(day, month, year, dailyFolder)
    }
    run()
}

module.exports = rename_format_daily_file