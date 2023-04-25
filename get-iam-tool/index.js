'use strict';

const fs = require('fs');

// @aws-sdk/client-iam
const { IAMClient, ListRolesCommand, ListAttachedRolePoliciesCommand, GetPolicyCommand, GetPolicyVersionCommand, GetRoleCommand } = require("@aws-sdk/client-iam");

// @aws-sdk/client-credentials-provider-node
const { defaultProvider } = require("@aws-sdk/credential-provider-node");

// IAMClientのインスタンスを作成する
const iam = new IAMClient({
  region: 'ap-northeast-1',
  credentials: defaultProvider({
    profile: 'your profile name'
  })
});

// IAMロールの一覧を取得する
// isTruncatedがtrueの場合は、次のページを取得する
const getRoles = async () => {
  let roles = [];
  let isTruncated = true;
  let marker = null;
  while (isTruncated) {
    const params = {
      MaxItems: 10,
      Marker: marker
    };
    const data = await iam.send(new ListRolesCommand(params));
    roles = roles.concat(data.Roles);
    isTruncated = data.IsTruncated;
    marker = data.Marker;
  }
  return roles;
};

// IAMロールに紐づくポリシーを取得する
const getAttachedRolePolicies = async (roleName) => {
  let policies = [];
  let isTruncated = true;
  let marker = null;
  while (isTruncated) {
    const params = {
      RoleName: roleName,
      MaxItems: 1000,
      Marker: marker
    };
    const data = await iam.send(new ListAttachedRolePoliciesCommand(params));
    policies = policies.concat(data.AttachedPolicies);
    isTruncated = data.IsTruncated;
    marker = data.Marker;
  }
  return policies;
};

// RoleNameとPolicyArnからポリシーの詳細を取得する
const getPolicy = async (PolicyArn) => {
  const params = {
    PolicyArn
  };
  const data = await iam.send(new GetPolicyCommand(params));
  const versionId = data.Policy.DefaultVersionId;
  const policyParams = {
    PolicyArn,
    VersionId: versionId
  };
  const policyVersion = await iam.send(new GetPolicyVersionCommand(policyParams));
  const policyDocument = JSON.parse(decodeURIComponent(policyVersion.PolicyVersion.Document));
  return {
    ...data,
    PolicyDocument: policyDocument
  };
};


(async () => {
  const roles = await getRoles();
  fs.writeFileSync('roles.json', JSON.stringify(roles, null, 2));


  // IAMロールの名前を表示する
  const roledetails = await Promise.allSettled(roles.map(async role => {
    const { RoleName, RoleId, Arn, CreateDate, AssumeRolePolicyDocument, Path, MaxSessionDuration, Tags } = role;
    const getRole = await iam.send(new GetRoleCommand({ RoleName }));
    const { RoleLastUsed } = getRole.Role;
    const assumeRolePolicyDocument = JSON.parse(decodeURIComponent(AssumeRolePolicyDocument));
    const policies = await getAttachedRolePolicies(RoleName);
    console.dir(policies, { depth: null })
    const policyNames = policies.map(policy => policy.PolicyName);
    const policyDetails = await Promise.all(policies.map(async policy => {
      const { PolicyArn, PolicyName } = policy;
      const policyDetail = await getPolicy(PolicyArn);
      return {
        PolicyArn,
        PolicyName,
        policyDetail
      };
    }));
    return {
      RoleName,
      RoleId,
      Arn,
      CreateDate,
      RoleLastUsed,
      assumeRolePolicyDocument,
      policyNames,
      policyDetails,
      Path,
      MaxSessionDuration,
      Tags,
    };
  }));
  // console.log(roledetails);
  const fulfilled = roledetails.filter(role => role.status === 'fulfilled').map(v => v.value);
  const rejected = roledetails.filter(role => role.status === 'rejected');
  fs.writeFileSync('roledetails.json', JSON.stringify(fulfilled, null, 2));
  fs.writeFileSync('rejected.json', JSON.stringify(rejected, null, 2));
  console.log(roledetails.length)
})();