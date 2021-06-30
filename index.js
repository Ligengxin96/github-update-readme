const core = require("@actions/core");
const axios = require("axios");
const { Octokit } = require("@octokit/rest");
const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

const getReadmeFile = async(url, requestOptions) => {
  try {
    const readme =  await octokit.request(url, requestOptions);
    console.log('Get README.md successful.');
    return readme;
  } catch (e) {
    console.error("Get README.md failed, with error: ", e.message);
    core.setFailed("Failed: ", e.message);
    throw new Error(e.message);
  }
}

const getActivityData = async(url, username) => {
  try {
    const activityData = await octokit.request(url, { username });
    console.log('Get activityData successful.');
    return activityData;
  } catch (e) {
    console.error("Get activityData, with error: ", e.message);
    core.setFailed("Failed: ", e.message);
    throw new Error(e.message);
  }
}

const updateReadme = async(url, requestOptions, repoImagsInfo, recentRepos) => {
  try {
    await octokit.request(url, requestOptions);
    core.setOutput("repositories", Array.from(recentRepos), JSON.stringify(repoImagsInfo));
    console.log('Update readme successful.');
  } catch (e) {
    console.error("Update readme failed with error: ", e.message);
    core.setFailed("Failed: ", e.message);
    throw new Error(e.message);
  }
}

const chunkArray = (array, size) => {
  let chunked = [];
  let index = 0;
  while (index < array.length) {
    chunked.push(array.slice(index, size + index));
    index += size;
  }
  return chunked;
}

const getTrafficData = async(reponame) => {
  console.log(`Get traffic data.`);
  try {
    let tryCount = 0;
    return new Promise((resolve) => {
      const timer = setInterval(async() => {
        const response = await axios.get(`http://getrepootrafficdata.herokuapp.com/v1/getrepoinfo/${reponame}?aggregate=true`);
        console.log(`Fetch traffic data ${tryCount + 1} times.`);
        if (++tryCount === 6) {
          clearInterval(timer);
          throw new Error('No response from server, please check your server health.');
        }
        if (response?.data?.isSuccess) {
          clearInterval(timer);
          resolve(response.data.data);
        }
      }, (tryCount + 1) * 10 * 1000);
    });
  } catch (error) {
    clearInterval(timer);
    throw error;
  }
}

(async () => {
  try {
    const ref = core.getInput('ref');
    const repoCount = parseInt(core.getInput('repoCount'));
    const repoPerRow = parseInt(core.getInput('reposPerRow'));
    const imageSize = parseInt(core.getInput('imageSize'));
    const path = core.getInput('path');
    const excludeActivity = core.getInput('excludeActivity');
    const repos = core.getInput('repos');
    const customReadmeFile = core.getInput("customReadmeFile");
    const header = core.getInput('header');
    const subhead = core.getInput('subhead');
    const footer = core.getInput('footer');
    const showTrafficData = core.getInput('showTrafficData');
    const trafficDataPosition = core.getInput('trafficDataPosition');
    const includeReposOrExcludeRepos = core.getInput('includeReposOrExcludeRepos');

    const isIncludeRepos = includeReposOrExcludeRepos === 'include';

    const username = process.env.GITHUB_REPOSITORY.split("/")[0];
    const repo = process.env.GITHUB_REPOSITORY.split("/")[1];

    console.log(`Job begin at: ${new Date()}`);

    let viewsData = {};
    let clonesData = {};
    try {
      const response = await getTrafficData(repo);
      viewsData = response.viewsData[0];
      clonesData = response.clonesData[0];
    } catch (error) {
      console.error(error.message);
    }

    console.log(`Get traffic data sucessful, viewsData: ${JSON.stringify(viewsData)}, clonesData: ${JSON.stringify(clonesData)}`);

    console.log('Get README.md.');
   
    const readmeFiles = await getReadmeFile('GET /repos/{owner}/{repo}/contents/{path}', {
      owner: username,
      repo,
      path,
    });

    const sha = readmeFiles.data.sha;

    let recentReposHaveImage = [];
    let recentRepos = new Set();

    console.log(`Get recentRepos info, repoCount: ${repoCount}`);
   
    /** GitHub Activity pagination is limited at 100 records x 3 pages */
    for (let i = 0; recentRepos.size < repoCount && i < 3; i++) {
      const activityData = await getActivityData(`GET /users/{username}/events/public?per_page=100&page=${i}`, username);
      const { data = {} } = activityData;
      for (const value of data) {
        let activityRepo = value.repo.name;
        if (value.type === "ForkEvent") {
          activityRepo = value.payload.forkee.full_name;
        }
        if (!JSON.parse(excludeActivity).includes(value.type)) {
          if(isIncludeRepos) {
            if (JSON.parse(repos).includes(activityRepo)) {
              console.log(`RecentRepos add ${activityRepo}`);
              recentRepos.add(activityRepo);
            }
          } else {
            if (!JSON.parse(repos).includes(activityRepo)) {
              console.log(`RecentRepos add ${activityRepo}`);
              recentRepos.add(activityRepo);
            }
          }
        }
       
        if (recentRepos.size >= repoCount) {
          break;
        }
      }
    }
    
    const repoImagsInfo = [];

    if (repoCount > 0) {
      console.log('Get repo display image.');
    }
    
    for await(const repo of recentRepos) {
      await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
        owner: repo.split("/")[0],
        repo: repo.split("/")[1],
        path: 'DISPLAY.jpg',
      }).then((response) => {
        if (response.data.name === 'DISPLAY.jpg') {
          console.log('Get repo display image sucessful.');
          recentReposHaveImage.push(true);
        } else {
          repoImagsInfo.push(`Waring: can't find 'DISPLAY.jpg' in ${repo}. Please upload 'DISPLAY.jpg'.`)
          recentReposHaveImage.push(false);
        }
      }).catch(e => {
        console.log('Get repo display image failed with error: ', e.message);
        repoImagsInfo.push(`Waring: can't find display.jpg in ${repo}. Please upload 'DISPLAY.jpg'.`)
        recentReposHaveImage.push(false);
      })
    }

    const generateRepoTable = () => {
      let tableContent = chunkArray(Array.from(recentRepos), repoPerRow).map((value, row) => {
        return `|${value.map(value => `[${value}](https://github.com/${value}) |`)}
                |${value.map(() => ` :-: |`)}
                |${value.map((value, col) => `<a href="https://github.com/${value}"><img src="https://github.com/${recentReposHaveImage[row * repoPerRow + col] ? value : `${username}/${repo}`}/raw/${ref}/DISPLAY.jpg" alt="${value}" title="${value}" width="${imageSize}" height="${imageSize}"></a> |`
        )}\n\n`
      }).toString().replace(/,/g, "");
      if (repoCount > 0) {
        tableContent = `---\n${tableContent}\n---\n`;
      }
      return tableContent;
    }

    const readmeContentData = customReadmeFile.replace(/\${\w{0,}}/g, (match) => {
      switch (match) {
        case "${repoTable}": 
          return generateRepoTable();
        case "${header}": 
          return header;
        case "${subhead}":
          if (showTrafficData && trafficDataPosition === 'subhead') {
            return subhead.replace(/'{repo}'/g, repo)
                          .replace(/'{startDate}'/g, viewsData.startDate).replace(/'{endDate}'/g, viewsData.endDate)
                          .replace(/'{viewsData}'/g, `{ count: ${viewsData.countTotal}, uniques: ${viewsData.uniquesTotal} }`)
                          .replace(/'{clonesData}'/g, `{ count: ${clonesData.countTotal}, uniques: ${clonesData.uniquesTotal} }`);
          }
          return subhead;
        case "${footer}": 
          if (showTrafficData && trafficDataPosition === 'footer') {
            return footer.replace(/'{repo}'/g, repo)
                          .replace(/'{startDate}'/g, viewsData.startDate).replace(/'{endDate}'/g, viewsData.endDate)
                          .replace(/'{viewsData}'/g, `{ count: ${viewsData.countTotal}, uniques: ${viewsData.uniquesTotal} }`)
                          .replace(/'{clonesData}'/g, `{ count: ${clonesData.countTotal}, uniques: ${clonesData.uniquesTotal} }`);
          }
          return footer;
        default:
          console.error(`${match} is not recognized`);
          return '';
      }
    });

    console.log('readmeContentData: ', readmeContentData);

    await updateReadme('PUT /repos/{owner}/{repo}/contents/{path}', {
      owner: username,
      repo,
      path,
      message: '(Automated) Update README.md',
      content: Buffer.from(readmeContentData, "utf8").toString('base64'),
      sha: sha,
    }, repoImagsInfo, recentRepos);

    console.log(`Job complete at: ${new Date()}`);
  } catch (e) {
    console.error("Error occrence with error: ", e.message)
    core.setFailed("Failed: ", e.message)
  }
})()
