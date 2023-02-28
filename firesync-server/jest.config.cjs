module.exports = {
  preset: 'ts-jest',
  roots: ['<rootDir>'],
  modulePaths: ['<rootDir>'],
  moduleNameMapper: {
    '@firesync/client': '<rootDir>/../../firesync/firesync-client'
  },
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
    '^.+\\.(js)$': 'babel-jest'
  }
}
