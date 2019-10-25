// import * as AWS from 'aws-sdk';
// import { DocumentClient } from 'aws-sdk/lib/dynamodb/document_client';
// import Response from "../../responses/api.responses";
import { CognitoLoginPayload } from "./tokens.interfaces";

export class TokensController {

	// private dynamo: DocumentClient = new AWS.DynamoDB.DocumentClient();

	public storeLoginTokens = async (event) => {
		const data: CognitoLoginPayload = event.body;
		console.log(data);

		// try {
		// 	console.log(event);
		//
		// 	return Response.success({ success: true })
		// } catch (err) {
		// 	return 'Unable to save user details';
		// }
	}

	// private pluckTokens = (event) => {
	//
	// }
	//
	// private updateUserTokens = (tokens) => {
	// 	const params = {
	// 		TableName: 'INS-USERS',
	// 		Key: {
	// 			_id: userId
	// 		},
	// 		UpdateExpression: 'set times.lastLogin = :now',
	// 		ExpressionAttributeValues: {
	// 			':now': new Date().toISOString()
	// 		},
	// 		ReturnValues: 'ALL_NEW'
	// 	};
	//
	// 	return this.dynamo.update(params).promise();
	// }

}
