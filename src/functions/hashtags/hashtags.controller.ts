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
        const toRemove = _.difference(oldTags, newTags);

        const additions = toAdd.map((t: string) => this.add(t, post));
        const removals = toRemove.map((t: string) => this.remove(t, post));
        await Promise.all(additions);
        await Promise.all(removals);
    }

    private add = async (hashTag: string, post: PostBrief) => {
        const tagData = await this.getTagData(hashTag);

        if (tagData.Item) await this.updateAddToCurrent(hashTag, post);
        else await this.insertNew(hashTag, post);
    }

    private remove = async (hashTag: string, post: PostBrief) => {
        const tagData = await this.getTagData(hashTag);

        if (tagData.Item.posts.length > 1) await this.updateRemoveFromCurrent(hashTag, post, tagData.Item.posts);
        else await this.delete(hashTag);
    }

    private getTagData = async (hashTag: string) => {
        const params = {
            TableName: 'INS-HASHTAGS',
            Key: {
                _tag: hashTag
            }
        };

        return this.dynamo.get(params).promise();
    }

    private insertNew = async (hashTag: string, post: PostBrief): Promise<any> => {
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

    private updateRemoveFromCurrent = async (hashTag: string, post: PostBrief, currentPosts: PostBrief[]) => {
        const postIndex = currentPosts.map(p => p._id).indexOf(post._id);
        if (postIndex < 0) return;

        const params = {
            TableName: 'INS-HASHTAGS',
            Key: {
                _tag: hashTag
            },
            UpdateExpression: `REMOVE posts[${postIndex}]`,
            ReturnValues: 'UPDATED_NEW'
        };

        return this.dynamo.update(params).promise();
    }

    private delete = async (hashTag: string) => {
        const params = {
            TableName: 'INS-HASHTAGS',
            Key: {
                _tag: hashTag
            }
        }

        return this.dynamo.delete(params).promise();
    }

}
