- Feature Name: Philosophy
- Start Date: 2024-05-28
- RFC PR: [#258](https://github.com/mizdra/happy-css-modules/pull/258)

# Summary

This RFC outlines the design philosophy of happy-css-modules.

# Motivation

When developing happy-css-modules, several design decisions need to be made. This RFC aims to present the design philosophy of happy-css-modules and use it as a basis for making these design decisions.

# Detailed design

The design philosophy of happy-css-modules is as follows:

- Provide a modern developer experience
- Compatibility with the ecosystem
- Editor independence
- Ease of use

## Provide a modern developer experience

In CSS Modules, styles are written in `.module.css` and imported from `.js`. Since `.js` and `.module.css` are written in different languages, it is difficult to use the language features of the editor. For example, you cannot jump to `.module.css` from `styles.foo` in `.js` using "Go to definition".

On the other hand, in CSS-in-JS, styles are written within `.js`, making it easy to use the editor's language features. Depending on the implementation, CSS-in-JS generally allows the use of features like "Go to definition", "rename" and "find references".

Thus, CSS Modules offer a less satisfactory developer experience compared to CSS-in-JS. However, we believe that with support tools, the developer experience of CSS Modules can be brought closer to that of CSS-in-JS. happy-css-modules aims to provide these support tools to enhance the developer experience of CSS Modules.

## Compatibility with the ecosystem

We aim to improve the developer experience for many CSS Modules users. Therefore, happy-css-modules places great importance on compatibility with existing ecosystems. For example, it maintains compatibility with preprocessors like PostCSS, Sass, and Less. Users who use preprocessors such as Sass or Less can also enhance their developer experience by using happy-css-modules.

## Editor independence

We want many developers to use happy-css-modules without being constrained by their choice of editor. Therefore, happy-css-modules aims for editor independence. For example, users of editors like VS Code, Vim, and Emacs can also use happy-css-modules.

## Ease of use

The ease of use of a tool is crucial. When a tool is easy to use, more people will adopt it. Additionally, it allows the tool to reach a wider range of users, including beginners. Therefore, happy-css-modules aims to be easy to use.
