import * as AWS from 'aws-sdk';
import { DocumentClient } from 'aws-sdk/lib/dynamodb/document_client';
import Auth from "../../auth/verify";
import Response from "../../responses/api.responses";
import ErrorTypes from "../../responses/error.types";

interface PostBrief {
    _id: string,
    imgURL: string
}

export class LocationsController {

    private dynamo: DocumentClient = new AWS.DynamoDB.DocumentClient();

    public getPosts = async (event) => {
        const data = JSON.parse(event.body);
        const { placeId, token }: { placeId: string, token: string } = data;

        const auth = await Auth.verify(token);
        if (auth.error) return Response.authFailed(ErrorTypes.AUTH_INVALID());

        try {
            const res = await this.getLocationData(placeId);

            return Response.success(res.Item);
        } catch (err) {
            console.error(err);
            if (err.custom) return Response.error(err);
            return Response.error(ErrorTypes.UNKNOWN('Unable to get posts relevant to location'));
        }
    }

    public getMatchingLocations = async (event) => {
        const data = JSON.parse(event.body);
        const { location, token }: { location: string, token: string } = data;

        const auth = await Auth.verify(token);
        if (auth.error) return Response.authFailed(ErrorTypes.AUTH_INVALID());

        try {
            const res = await this.getSimilarLocations(location);

            return Response.success({ locations: res.Items });
        } catch (err) {
            console.error(err);
            if (err.custom) return Response.error(err);
            return Response.error(ErrorTypes.UNKNOWN('Unable to get similar Locations'));
        }

    }

    public add = async (placeId: string, locationName: string, geoData: object, post: PostBrief) => {
        const locationData = await this.getLocationData(placeId);

        if (locationData.Item) await this.updateAddToCurrent(placeId, post);
        else await this.insertNew(placeId, locationName, geoData, post);
    }

    public remove = async (placeId: string, post: PostBrief) => {
        const locationData = await this.getLocationData(placeId);

        if (locationData.Item.posts.length > 1) await this.updateRemoveFromCurrent(placeId, post, locationData.Item.posts);
        else await this.delete(placeId);
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

    private getSimilarLocations = async (location: string) => {
        const params = {
            TableName: 'INS-LOCATIONS',
            FilterExpression: 'contains(#lo, :lo)',
            ProjectionExpression: '#lo, #pid',
            ExpressionAttributeNames: {
                '#lo': 'locationName',
                '#pid': '_placeId'
            },
            ExpressionAttributeValues: {
                ':lo': location
            }
        };

        return this.dynamo.scan(params).promise();
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

    private updateRemoveFromCurrent = async (placeId: string, post: PostBrief, currentPosts: PostBrief[]) => {
        const postIndex = currentPosts.map(p => p._id).indexOf(post._id);
        if (postIndex < 0) return;

        const params = {
            TableName: 'INS-LOCATIONS',
            Key: {
                _placeId: placeId
            },
            UpdateExpression: `REMOVE posts[${postIndex}]`,
            ReturnValues: 'UPDATED_NEW'
        };

        return this.dynamo.update(params).promise();
    }

    private delete = async (placeId: string) => {
        const params = {
            TableName: 'INS-LOCATIONS',
            Key: {
                _placeId: placeId
            }
        }

        return this.dynamo.delete(params).promise();
    }

}
