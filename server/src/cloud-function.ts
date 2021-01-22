import got, { HTTPError } from 'got'
import * as tar from 'tar'
import streamToArray from 'stream-to-array'
import { once } from 'events'
import assert from 'assert'
import { NextFunction, Request, Response } from 'express'
import * as path from 'path'
import createSandbox from 'codesandbox-import-utils/lib/create-sandbox'
import { INormalizedModules } from 'codesandbox-import-util-types'
import { decamelizeKeys } from 'humps'

const collectionId = process.env.CODESANDBOX_COLLECTION_ID?.trim()
assert(collectionId, 'Expected CODESANDBOX_COLLECTION_ID to be set')

const codesandboxToken = process.env.CODESANDBOX_TOKEN?.trim()
assert(codesandboxToken, 'Expected CODESANDBOX_TOKEN to be set')

enum Privacy {
    Public = 0,
    Unlisted = 1,
    Private = 2,
}

export const serve = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
        const fullName = request.query.fullName
        if (typeof fullName !== 'string') {
            throw Object.assign(new Error('No fullName provided'), { status: 400 })
        }
        const tarStream = request.pipe(new (tar.Parse as any)())
        const files: INormalizedModules = {}
        tarStream.on('entry', (entry: tar.ReadEntry) => {
            ;(async () => {
                const filePath = path.posix.normalize(entry.path)
                if (entry.type === 'File') {
                    files[filePath] = {
                        isBinary: false,
                        content: Buffer.concat(await streamToArray(entry as any)).toString(),
                    }
                } else {
                    if (entry.type === 'directory') {
                        files[filePath] = {
                            type: 'directory',
                        }
                    }
                    entry.resume()
                }
            })().catch(next)
        })
        await once(tarStream, 'end')
        console.log('Making request to Codesandbox for', fullName)

        const sandbox = await createSandbox(files)

        const json = {
            sandbox: decamelizeKeys({
                ...sandbox,
                collectionId,
                title: `Submission by ${fullName}`,
                private: Privacy.Private,
            }),
        }
        const codesandboxResponse = await got.post<CodesandboxResult>('https://codesandbox.io/api/v1/sandboxes', {
            methodRewriting: false,
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${codesandboxToken}`,
            },
            responseType: 'json',
            json,
        })
        response.status(203).json({ sandboxUrl: `https://codesandbox.io/s/${codesandboxResponse.body.data.alias}` })
    } catch (error) {
        console.error(error)
        if (error instanceof HTTPError) {
            console.error(error.response.body)
        }
        response.status(error.status ?? 500).send(error?.response?.body || error.message)
        next(error)
        return
    }
}

interface CodesandboxResult {
    data: CodesandboxData
}

interface CodesandboxData {
    alias: string
    always_on: boolean
    author: {
        avatar_url: string
        id: string
        name: string
        personal_workspace_id: string
        subscription_plan: any
        subscription_since: any
        username: string
    }
    authorization: 'owner'
    base_git: any
    collection: {
        id: string
        path: string
    }
    custom_template: any
    description: string | null
    directories: any[]
    entry: string
    external_resources: any[]
    feature_flags: {
        comments: boolean
        container_lsp: boolean
    }
    fork_count: number
    forked_from_sandbox: null
    forked_template: null
    forked_template_sandbox: null
    git: null
    id: string
    is_frozen: boolean
    is_sse: boolean
    like_count: number
    modules: any[]
    npm_dependencies: {}
    npm_registries: any[]
    original_git: null
    original_git_commit_sha: null
    owned: boolean
    permissions: {
        prevent_sandbox_export: boolean
        prevent_sandbox_leaving: boolean
    }
    picks: any[]
    pr_number: number | null
    preview_secret: string
    privacy: Privacy
    room_id: string
    screenshot_url: null | string
    source_id: string
    tags: any[]
    team: {
        avatar_url: string | null
        id: string
        name: string
    }
    template: 'parcel'
    title: string
    updated_at: string
    user_liked: boolean
    version: number
    view_count: number
}
