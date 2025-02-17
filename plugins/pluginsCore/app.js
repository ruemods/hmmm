const config = require('../../config');
const {default:axios} = require('axios');

class appClient {
	constructor() {
		this.platform = process.env.PWD?.includes("userland") ? "LINUX" : process.env.PITCHER_API_BASE_URL?.includes("codesandbox") ? "CODESANDBOX" : process.env.REPLIT_USER ? "REPLIT" : process.env.AWS_REGION ? "AWS" : process.env.TERMUX_VERSION ? "TERMUX" : process.env.DYNO ? "HEROKU" : process.env.KOYEB_APP_ID ? "KOYEB" : process.env.GITHUB_SERVER_URL ? "GITHUB" : process.env.RENDER ? "RENDER" : process.env.RAILWAY_SERVICE_NAME ? "RAILWAY" : process.env.VERCEL ? "VERCEL" : process.env.DIGITALOCEAN_APP_NAME ? "DIGITALOCEAN" : process.env.AZURE_HTTP_FUNCTIONS ? "AZURE" : process.env.NETLIFY ? "NETLIFY" : process.env.FLY_IO ? "FLY_IO" : process.env.CF_PAGES ? "CLOUDFLARE" : process.env.SPACE_ID ? "HUGGINGFACE" : "VPS";
		this.koyeb = axios.create({baseURL: 'https://app.koyeb.com/v1', headers: {'Content-Type': 'application/json;charset=UTF-8', Authorization: `Bearer ${config.KOYEB_API_KEY}`}});
		this.render = axios.create({baseURL: 'https://api.render.com/v1', headers: {Authorization: `Bearer ${config.RENDER_API_KEY}`}});
	}
	
	async getAppData() {
		if(this.platform) {
			switch (this.platform) {
				case 'KOYEB': {
					const response = await this.koyeb.get('/services');
					const appData = response.data.services.find(app => app.name === config.KOYEB_SERVICE_NAME);
					return appData ? appData : false;
					break;
				}
				case 'RENDER': {
					const response = await this.render.get('/services');
					const appData = response.data.find(app => app.service.name === config.RENDER_APP_NAME);
					return appData ? {id: appData.service.id, name: appData.service.name, region: appData.service.serviceDetails.region, runtime: appData.service.serviceDetails.region} : false;
					break;
				}
				default: {
					console.log("Unsupported platform.", this.platform);
				}
			}
			return;
		}
	}
	async deploymentInfo() {
		if(this.platform) {
			switch (this.platform) {
				case 'KOYEB': {
					const app = await this.getAppData();
				    const {data} = await this.koyeb.get(`/deployments?service_id/${app.id}`)
				    return data.deployments[0].status;
				    break;
				}
				case 'RENDER': {
					
				}
				default: {
					console.log("Unsupported platform.", this.platform);
				}
			}
			return;
		}
	}
	
	async update() {
		if(this.platform) {
			switch (this.platform) {
				case 'KOYEB': {
					const app = await this.getAppData();
					try {
						return await this.koyeb.post(`/services/${app.id}/redeploy`, { deployment_group: 'prod'})
					} catch (e) {
						console.log('Build failed!' +  e.message);
					}
					break;
				}
				case 'RENDER': {
					const app = await this.getAppData();
				    const updateStatus = await this.render.post('/services/' + app.id + '/deploys', { option: 'do_not_clear' });
				    return updateStatus.status === 201 ? true : false;
				    break;
				}
				default: {
					console.log("Unsupported platform.", this.platform);
				}
			}
			return;
		}
	}
	async setVar(key, value) {
		if (this.platform) {
			switch(this.platform) {
				case 'KOYEB': {
					const app = await this.getAppData();
				    const fetchDeploymentData = await this.koyeb.get('/deployments/' + app.latest_deployment_id);
				    const deployedRegion = fetchDeploymentData.data.deployment.definition.env.flatMap(item => item.scopes).find(scope => scope.startsWith('region:'));
				    const envVars = fetchDeploymentData.data.deployment.definition.env.map((envVar) => {
			        if(envVar.key === key) {
						return { ...envVar, value };
					}
					return envVar;
					});
					if (!envVars.some((envVar) => envVar.key === key)) {
						envVars.push({ scopes: [deployedRegion], key, value });
					}
					const setVariable = await this.koyeb.patch(`/services/${app.id}`, { definition: { ...fetchDeploymentData.data.deployment.definition, env: envVars }});
				    return setVariable.status === 200 ? true : false;
				    break;
				}
				case 'RENDER': {
					const app = await this.getAppData();
					const getVars = await this.render.get('/services/' + app.id + '/env-vars');
				    const envVars = getVars.data.map((env) => {
					if(env.envVar.key === key) {
						return { ...env.envVar, value };
					}
					return env.envVar;
				    });
				    if(!envVars.some((envVar) => envVar.key === key)) {
					    envVars.push({ key, value });
				    }
				    const setVariable = await this.render.put('/services/' + app.id + '/env-vars', envVars);
				    await this.update();
				    return setVariable.status === 200 ? true : false;
				    break;
				}
				default: {
					console.log("Unsupported platform.", this.platform);
				}
			}
			return;
		}
	}
	async deleteVar(key) {
		if (this.platform) {
			switch (this.platform) {
				case 'KOYEB': {
					const app = await this.getAppData();
				    const fetchDeploymentData = await this.koyeb.get('/deployments/' + app.latest_deployment_id);
				    const vaildKey = fetchDeploymentData.data.deployment.definition.env.some(env => env.key === key);
				    if(!vaildKey) return false;
			     	const envVars = fetchDeploymentData.data.deployment.definition.env.filter(envVar => envVar.key !== key);
				    const delVariable = await this.koyeb.patch(`/services/${app.id}`, { definition: { ...fetchDeploymentData.data.deployment.definition, env: envVars }});
			    	return delVariable.status === 200 ? true : false;
			    	break;
				}
				case 'RENDER': {
					const app = await this.getAppData();
				    const getVars = await this.render.get('/services/' + app.id + '/env-vars');
				    const validKey = getVars.data.some(env => env.envVar.key === key);
				    if(!validKey) return false;
				    const envVars = getVars.data.filter(env => env.envVar.key !== key).map(env => ({ key: env.envVar.key, value: env.envVar.value }));
				    const delVariable = await this.render.put('/services/' + app.id + '/env-vars', envVars);
				    await this.update();
				    return delVariable.status === 200 ? true : false;
				    break;
				}
				default: {
					console.log("Unsupported platform.", this.platform);
				}
			}
			return;
		}
	}
	
	async getVars() {
		if (this.platform) {
			switch (this.platform) {
				case 'KOYEB': {
				 	const app = await this.getAppData();
				    const fetchDeploymentData = await this koyeb.get('/deployments/' + app.latest_deployment_id);
				    const varsArray = fetchDeploymentData.data.deployment.definition.env.map(item => ({ key: item.key, value: item.value }));
				    return varsArray ? varsArray : false;
			    	break;
				}
				case 'RENDER': {
				 	const app = await getAppData();
				    const getVars = await this.render.get('/services/' + app.id + '/env-vars');
				    const varsArray = getVars.data.map(env => ({ key: env.envVar.key, value: env.envVar.value }));
				    return varsArray ? varsArray : false;
				}
				default: {
					console.log("Unsupported platform.", this.platform);
				}
			}
			return
		}
	}
}

module.exports = appClient;
