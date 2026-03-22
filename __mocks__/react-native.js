module.exports = {
  Platform: { OS: 'web', select: (obj) => obj.web || obj.default },
  StyleSheet: { create: (s) => s, absoluteFillObject: {} },
  View: 'View',
  Text: 'Text',
  Image: 'Image',
  TouchableOpacity: 'TouchableOpacity',
  Alert: { alert: jest.fn() },
  Linking: { openURL: jest.fn() },
};
