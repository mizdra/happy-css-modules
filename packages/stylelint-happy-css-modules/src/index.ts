import { createPlugin } from 'stylelint';
import { NAMESPACE } from './constant';
import { rules } from './rules';

const rulesPlugins = Object.entries(rules).map(([ruleName, rule]) => {
  return createPlugin(`${NAMESPACE}/${ruleName}`, rule);
});

// eslint-disable-next-line import/no-default-export
export default rulesPlugins;
