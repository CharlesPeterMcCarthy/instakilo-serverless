import * as AWS from 'aws-sdk';
import { DocumentClient } from 'aws-sdk/lib/dynamodb/document_client';

interface PostBrief {
    _id: string,
    imgURL: string
}

export class LocationsController {

    private dynamo: DocumentClient = new AWS.DynamoDB.DocumentClient();

    public add = async (placeId: string, locationName: string, geoData: object, post: PostBrief) => {
        const locationData = await this.getLocationData(placeId);

        if (locationData.Item) await this.updateAddToCurrent(placeId, post);
        else await this.insertNew(placeId, locationName, geoData, post);
    }

    private getLocationData = async (placeId: string) => {
        const params = {
            TableName: 'INS-LOCATIONS',
            Key: {
                _placeId: placeId
            }
        };

        return this.dynamo.get(params).promise();
    }

    private insertNew = async (placeId: string, locationName: string, geoData: object, post: PostBrief): Promise<any> => {
        const params = {
            TableName: 'INS-LOCATIONS',
            Item: {
                _placeId: placeId,
                locationName,
                geoData,
                posts: [ post ]
            }
        };

        return this.dynamo.put(params).promise();
    }

    private updateAddToCurrent = async (placeId: string, post: PostBrief) => {
        const params = {
            TableName: 'INS-LOCATIONS',
            Key: {
                _placeId: placeId
            },
            UpdateExpression: 'SET posts = list_append(posts, :p)',
            ExpressionAttributeValues: {
                ':p': [ post ]
            },
            ReturnValues: 'UPDATED_NEW'
        };

        return this.dynamo.update(params).promise();
    }

}
