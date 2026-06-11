module.exports = function transformImportMetaEnv({ types: t }) {
  return {
    name: 'transform-import-meta-env',
    visitor: {
      MemberExpression(path) {
        const property = path.node.property;
        if (!t.isIdentifier(property)) {
          return;
        }

        const object = path.node.object;
        if (
          !t.isMemberExpression(object) ||
          !t.isMetaProperty(object.object) ||
          object.object.meta.name !== 'import' ||
          object.object.property.name !== 'meta' ||
          !t.isIdentifier(object.property, { name: 'env' })
        ) {
          return;
        }

        path.replaceWith(
          t.memberExpression(
            t.memberExpression(t.identifier('process'), t.identifier('env')),
            t.identifier(property.name)
          )
        );
      },
    },
  };
};
