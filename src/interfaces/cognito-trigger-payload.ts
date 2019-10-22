export default interface CognitoPayload {
	version: string | number,
	region: string, // eu-west-1
	userPoolId: string,
	userName: string,
	callerContext: {
		awsSdkVersion: string,
		clientId: string
	},
	triggerSource: string,
	request: any,
	response: any
}
