import * as AWS from 'aws-sdk';
import { DocumentClient } from 'aws-sdk/lib/dynamodb/document_client';
import _ from 'lodash';

interface PostBrief {
    _id: string,
    imgURL: string
}

export class HashTagsController {

    private dynamo: DocumentClient = new AWS.DynamoDB.DocumentClient();

    public sort = async (oldTags: string[] = [], newTags: string[], post: PostBrief) => {
        const toAdd = _.difference(newTags, oldTags);

        const additions = toAdd.map((t: string) => this.add(t, post));
        await Promise.all(additions);
    }

    private add = async (hashTag: string, post: PostBrief) => {
        console.log('adding tags')
        console.log(hashTag);
        console.log(post);
        const tagData = await this.getTagData(hashTag);

        if (tagData.Item) await this.updateAddToCurrent(hashTag, post);
        else await this.insertNew(hashTag, post);
    }

    private getTagData = async (hashTag: string) => {
        console.log('getting tag: ' + hashTag)
        const params = {
            TableName: 'INS-HASHTAGS',
            Key: {
                _tag: hashTag
            }
        };

        return this.dynamo.get(params).promise();
    }

    private insertNew = async (hashTag: string, post: PostBrief): Promise<any> => {
        console.log('inserting: ' + hashTag, post);

        const params = {
            TableName: 'INS-HASHTAGS',
            Item: {
                _tag: hashTag,
                posts: [ post ]
            }
        };

        return this.dynamo.put(params).promise();
    }

    private updateAddToCurrent = async (hashTag: string, post: PostBrief) => {
        console.log('update add: ' + hashTag, post);

        const params = {
            TableName: 'INS-HASHTAGS',
            Key: {
                _tag: hashTag
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
