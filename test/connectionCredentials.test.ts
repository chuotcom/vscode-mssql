'use strict';
import * as TypeMoq from 'typemoq';

import vscode = require('vscode');
// import fs = require('fs');
import * as utils from '../src/models/utils';
// import * as connectionInfo from '../src/models/connectionInfo';
import * as Constants from '../src/models/constants';
import * as stubs from './stubs';
import * as interfaces from '../src/models/interfaces';
import { CredentialStore } from '../src/credentialstore/credentialstore';
import { ConnectionProfile } from '../src/models/connectionProfile';
import { ConnectionStore } from '../src/models/connectionStore';
import { ConnectionCredentials } from '../src/models/ConnectionCredentials';
import { IPrompter, IQuestion} from '../src/prompts/question';
import { TestPrompter } from './stubs';
import { IConnectionProfile, IConnectionCredentials } from '../src/models/interfaces';
import VscodeWrapper from '../src/controllers/vscodeWrapper';

import assert = require('assert');

suite('ConnectionCredentials Tests', () => {
    let defaultProfile: interfaces.IConnectionProfile;
    let prompter: TypeMoq.Mock<IPrompter>;
    let context: TypeMoq.Mock<vscode.ExtensionContext>;
    let credentialStore: TypeMoq.Mock<CredentialStore>;
    let vscodeWrapper: TypeMoq.Mock<VscodeWrapper>;
    let connectionStore: TypeMoq.Mock<ConnectionStore>;

    setup(() => {
        defaultProfile = Object.assign(new ConnectionProfile(), {
            profileName: 'defaultProfile',
            server: 'namedServer',
            database: 'bcd',
            authenticationType: utils.authTypeToString(interfaces.AuthenticationTypes.SqlLogin),
            user: 'cde'
        });


        prompter = TypeMoq.Mock.ofType(TestPrompter);
        context = TypeMoq.Mock.ofType(stubs.TestExtensionContext);
        credentialStore = TypeMoq.Mock.ofType(CredentialStore);
        vscodeWrapper = TypeMoq.Mock.ofType(VscodeWrapper);
        connectionStore = TypeMoq.Mock.ofType(ConnectionStore);

        // setup default behavior for vscodeWrapper
        // setup configuration to return maxRecent for the #MRU items
        let maxRecent = 5;
        let configResult: {[key: string]: any} = {};
        configResult[Constants.configMaxRecentConnections] = maxRecent;
        let config = stubs.createWorkspaceConfiguration(configResult);
        vscodeWrapper.setup(x => x.getConfiguration(TypeMoq.It.isAny()))
        .returns(x => {
            return config;
        });
    });


    function connectProfile( profile: IConnectionProfile, emptyPassword: boolean): Promise<IConnectionCredentials> {
        // Setup input paramaters
        let isProfile: boolean = true;
        let isPasswordRequired: boolean = false;
        let wasPasswordEmptyInConfigFile: boolean = emptyPassword;
        let answers = {};

        // Mocking functions
        connectionStore.setup(x => x.removeProfile(TypeMoq.It.isAny())).returns((profile1: IConnectionProfile) => (Promise.resolve(true)));
        connectionStore.setup(x => x.saveProfile(TypeMoq.It.isAny())).returns((profile1: IConnectionProfile) => (Promise.resolve(profile1)));
        prompter.setup(x => x.prompt(TypeMoq.It.isAny())).returns((questions: IQuestion[]) => Promise.resolve(answers));

        // Call function to test
        return ConnectionCredentials.ensureRequiredPropertiesSet(
            profile,
            isProfile,
            isPasswordRequired,
            wasPasswordEmptyInConfigFile,
            prompter.object,
            connectionStore.object);
    }


    // Connect with savePassword true and filled password and ensure password is saved and removed from plain text
    test('ensureRequiredPropertiesSet should remove password from plain text and save password to Credential Store', done => {
        // Setup Profile Information to have savePassword on and filled in password
        let profile = Object.assign(new ConnectionProfile(), defaultProfile, {
            savePassword: true,
            password: 'hasPassword'
        });
        let emptyPassword = false;

        connectProfile(profile, emptyPassword).then( success => {
            assert.ok(success);
            connectionStore.verify(x => x.removeProfile(TypeMoq.It.isAny()), TypeMoq.Times.once());
            connectionStore.verify(x => x.saveProfile(TypeMoq.It.isAny()), TypeMoq.Times.once());
            done();
        }).catch(err => done(new Error(err)));
    });

    // Connect with savePassword true and empty password does not reset password
    test('ensureRequiredPropertiesSet should keep Credential Store password', done => {
        // Setup Profile Information to have savePassword on and blank
        let profile = Object.assign(new ConnectionProfile(), defaultProfile, {
            savePassword: true,
            password: ''
        });

        let emptyPassword = true;
        connectProfile(profile, emptyPassword).then( success => {
            assert.ok(success);
            connectionStore.verify(x => x.removeProfile(TypeMoq.It.isAny()), TypeMoq.Times.never());
            connectionStore.verify(x => x.saveProfile(TypeMoq.It.isAny()), TypeMoq.Times.never());
            done();
        }).catch(err => done(new Error(err)));
    });

    /*// Connect with savePassword true and filled password then connect again with a different password and
    // ensure that previous password is overwritten
    test('ensureRequiredPropertiesSet should update Credential Store Password if it has changed', done => {
        connectSavePassword();
        done();
    });

    // Connect with savePassword true and blank password then connect again with blank password
    // ensure that previous password is entered at connect time persists
    test('ensureRequiredPropertiesSet should request password and save it', done => {
        connectSavePassword();
        done();
    });

    // Connect with savePassword false and ensure password is never saved
    test('ensureRequiredPropertiesSet should not save password', done => {
        connectSavePassword();
        done();
    });*/
});