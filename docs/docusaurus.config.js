/* eslint-disable @typescript-eslint/no-var-requires */
// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

const lightCodeTheme = require('prism-react-renderer/themes/github')
const darkCodeTheme = require('prism-react-renderer/themes/dracula')
require('dotenv').config()

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'FireSync Docs',
  tagline: 'PaaS for real-time collaborative apps',
  url: 'https://docs.firesync.dev',
  baseUrl: '/',
  onBrokenLinks: 'warn',
  onBrokenMarkdownLinks: 'warn',
  favicon: 'img/favicon.png',

  customFields: {
    firesyncToken: process.env.FS_TOKEN,
    firesyncBaseUrl: process.env.FS_BASE_URL
  },

  // Even if you don't use internalization, you can use this field to set useful
  // metadata like html lang. For example, if your site is Chinese, you may want
  // to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en']
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
          routeBasePath: '/',
          sidebarCollapsible: false
        },
        blog: {
          showReadingTime: true
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css')
        }
      })
    ],

    [
      'redocusaurus',
      {
        // Plugin Options for loading OpenAPI files
        specs: [
          {
            spec: '../firesync-server/openapi.json',
            route: '/api/'
          }
        ]
      }
    ]
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({      
      colorMode: {
        defaultMode: 'dark',
      },
      announcementBar: {
        id: 'wip',
        content: '⚠️ These docs are a work in progress',
        backgroundColor: '#cdb6f8',
        isCloseable: false
      },
      navbar: {
        title: 'FireSync',
        logo: {
          src: 'img/logo.png'
        },
        items: [
          {
            type: 'doc',
            docId: 'quick-start',
            position: 'left',
            label: 'Docs'
          },
          {
            href: 'https://github.com/firesync-org/firesync',
            label: 'GitHub',
            position: 'right'
          },
          {
            href: 'https://www.firesync.cloud',
            label: 'FireSync Cloud',
            position: 'right'
          }
        ]
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Docs',
            items: [
              {
                label: 'Guides',
                to: '/category/guides'
              },
              {
                label: 'Reference',
                to: '/category/reference'
              }
            ]
          },
          {
            title: 'Community',
            items: [
              {
                label: 'Twitter',
                href: 'https://twitter.com/firesyncapp'
              }
            ]
          },
          {
            title: 'More',
            items: [
              {
                label: 'GitHub',
                href: 'https://github.com/firesyncorg/firesync'
              }
            ]
          }
        ],
        copyright: `Copyright © ${new Date().getFullYear()} FireSync.`
      },
      prism: {
        theme: lightCodeTheme,
        darkTheme: darkCodeTheme
      }
    })
}

module.exports = config
