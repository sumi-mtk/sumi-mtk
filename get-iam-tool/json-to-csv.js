const fs = require('fs');
const json2csv = require('json2csv').parse;

// jsonからcsvに変換する
const jsonToCsv = async (json) => {
  const csv = json2csv(json);
  return csv;
}

const main = async () => {
  const json = JSON.parse(fs.readFileSync('./roledetails.json'));
  const obj = json.map(role => {
    const { RoleName, RoleId, Arn, CreateDate, assumeRolePolicyDocument, policyNames, policyDetails, Path, MaxSessionDuration, Tags, RoleLastUsed } = role;
    const sortedPolicyNames = policyNames.sort();
    return {
      RoleName,
      RoleId,
      Arn,
      CreateDate,
      LastUsedDate: RoleLastUsed ? RoleLastUsed.LastUsedDate : '',
      assumeRolePolicyDocument: JSON.stringify(assumeRolePolicyDocument),
      policyNames: sortedPolicyNames.join(','),
      policyDetails: JSON.stringify(policyDetails.map(policyDetail => {
        return policyDetail.policyDetail.PolicyDocument;
      })),
    }
  });
  console.dir(obj, { depth: null });
  const csv = await jsonToCsv(obj);
  fs.writeFileSync('./roledetails.csv', csv);
}

(async () => {
  await main();
})();
