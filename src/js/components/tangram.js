// Tangram can't be bundled from source since it needs to be able to access a full copy of itself
// (either as a URL or full string of all source code) in order to load itself into web workers
// This script injects the Tangram with script tag, so that Tangram doesn't need to be included with outside tag
var L = require('leaflet');

var tangramLayerInstance;
var tangramVersion = '0.11';

var TangramLayer = L.Class.extend({
  includes: L.Mixin.Events,
  options: {
    fallbackTile: L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {}),
    tangramURL: 'https://mapzen.com/tangram/' + tangramVersion + '/tangram.min.js'
  },
  initialize: function (opts) {
    if (opts.debug) this.options.tangramURL = 'https://mapzen.com/tangram/' + tangramVersion + '/tangram.debug.js';
    this.hasWebGL = this._hasWebGL();
    this.options = L.extend({}, opts, this.options);

    // Start importing script
    // When there is no Tangram object available.
    if (typeof Tangram === 'undefined') {
      this._importScript(this.options.tangramURL);
    } else {
      // Not more than one Tangram instance is allowed.
      // console.log('Tangram is already on the page.');
    }
  },

  addTo: function (map) {
    if (typeof Tangram === 'undefined') {
      if (this.hasWebGL) {
        return window.setTimeout(this.addTo.bind(this, map), 100);
      } else {
        if (map.options.fallbackTile) {
          console.log('WebGL is not available, falling back to fallbackTile option.');
          map.options.fallbackTile.addTo(map);
        } else {
          // When WebGL is not avilable
          console.log('WebGL is not available, falling back to OSM default tile.');
          this.options.fallbackTile.addTo(map);
        }
      }
    } else {
      if (map.options.debugTangram) {
        console.log('given scene:', map.options.scene);
        console.log('using scene:', (map.options.scene || L.Mapzen.HouseStyles.BubbleWrap));
      }
      this._layer = Tangram.leafletLayer({
        scene: (map.options.scene || L.Mapzen.HouseStyles.BubbleWrap)
      }).addTo(map);
      var self = this;
      self._layer.on('init', function () {
        self.fire('loaded', {
          layer: self._layer,
          version: tangramVersion
        });
      });
    }
  },

  _importScript: function (sSrc) {
    var oScript = document.createElement('script');
    oScript.type = 'text/javascript';
    oScript.onerror = this._loadError;

    if (document.currentScript) document.currentScript.parentNode.insertBefore(oScript, document.currentScript);
    // If browser doesn't support currentscript position
    // insert script inside of head
    else document.getElementsByTagName('head')[0].appendChild(oScript);
    oScript.src = sSrc;
  },
  _loadError: function (oError) {
    console.log(oError);
    throw new URIError('The script ' + oError.target.src + ' is not accessible.');
  },
  _hasWebGL: function () {
    try {
      var canvas = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
    } catch (x) {
      return false;
    }
  }
});

module.exports = TangramLayer;

module.exports.tangramLayer = function (opts) {
  // Tangram can't have more than one map on a browser context.
  if (!tangramLayerInstance) {
    tangramLayerInstance = new TangramLayer(opts);
  } else {
    // console.log('Only one Tangram map on page can be drawn. Please look at https://github.com/tangrams/tangram/issues/350');
  }
  return tangramLayerInstance;
};
