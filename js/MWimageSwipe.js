/*
 * jquery.MWimageSwipe 1.0
 * 
 * The plugin allows to integrate a customizable, cross-browser content slider 
 * into your web presence and it is responsive support. Designed for use as a 
 * content slider, carousel, scrolling website banner, or image gallery.
 * 
 * Browser Support Details
 *   - FireFox 5.0+
 *   - Safari 5.0+
 *   - Chrome 19.0+
 *   - Internet Explorer 7+
 *   - Android 2.3+ 
 *   - Opera 12.0+
 *   - iOS Safari 4.0+
 */
;(function($) {
$.fn.MWimageSwipe = function ( config ) {
  /****************************************************************************
    == CONFIGURATION OPTION == 
    - bulletNavigator {Boolean}, default as true,
         The true appends bullet navigator to the current object. The bullet
         mode will be change when the imege is changed, and it'll change
         the image by clicking. Otherwise creating of bullet will be ignored.
    - ArrowNavigator {Boolean}, default as true,
         The true appends arrow navigators to the current object. The right
          arrow navigates to next image and the previous left arrow 
          navigates to the previous image by clicking. Otherwise creating 
          of arrows will be ignored. 
    - distance {Integer}, default as 20
        When the drag distance of the image is great than this value, the 
        current image will be replace by a next image.
    - duration {Integer}, default as 600 (millisecond)
        A number determining how long the animation will run.
    - startIndexImage {Integer}, default as 0
        A number determining which image will display in the beginning.
    - carousel {Boolean}, default as false
        The true makes the slider loop in both directions with no end.
    - reverse {Boolean}, default as false
        It'll effect the autoSwipe direction. The true refers to swipe the 
        images from left to right, otherwise it swipes from right to left. 
    - autoSwipe {Boolean|Integer}, default as 0
        The true (will be convert to 5000 milliseconds) or a number will enable 
        automatic cycling through slides. Otherwise automatic cycling is 
        disabled.    
    - incremental {Boolean|Integer}, default as 0
        The true (will be convert to 1) or a number will enable incremental 
        load. The number determining how many previous and next image will be
        loaded when the current image appears. Otherwise all images will be 
        load in the beginning
  ****************************************************************************/
  var opts = {
    'main'       : this,
    'slider'     : this.find('.slider'),
    'onSlide'    : false,
    'out'        : 0,
    'ie'         : $.browser.msie ? $.browser.version : 0,
    'waiting'    : [],
    'distance'   : config['distance']        || 20,
    'duration'   : config['duration']        || 600,
    'atIndex'    : config['startIndexImage'] || 0,
    'carousel'   : config['carousel']        || false,
    'reverse'    : config['reverse']         || false,
    'aNavigator' : config['arrowNavigator']  == null ? 
      true : config['arrowNavigator'],
    'bNavigator' : config['bulletNavigator'] == null ? 
      true : config['bulletNavigator'],
    'autoTime'   : ! config['autoSwipe'] ? 0 : 
      (config['autoSwipe']==true ? 5000 : config['autoSwipe']),
    'incremental': ! config['incremental'] ? 0 :
      (config['incremental']==true ? 1 : config['incremental']),
    'isMobile'   :
      (navigator.appVersion.indexOf('Mobile') > -1) 
      //&&
      //(! ( navigator.userAgent.match(/iPad/i) != null ))
  };

  var helper = {
    /*************************************************************************
      === Initialization ===
    **************************************************************************/
    init : function() {
      if ( helper._initImageOption() ) { // Images validation
        opts['left']   = parseInt( opts['slider'].css('left'), 10 ); 
        opts['second'] = parseFloat( opts['duration'] / 1000, 10 );

        helper._initBulletOption();     // Append bullets navigator        
        helper._initArrowOption();      // Append arrows navigator
        helper._initCarouselOption();   // Carousel initialization
        helper._initImageCloneOption(); // Check is there any img tag exist

        // Importen to render this function for correct size of image
        helper.verifyImagesLeft();

        // Bind window resizing.
        $( window ).bind('resize', helper.verifyAtIndexLeft ).resize();

        // Bind swipe
        helper._initSwiping();

        if ( opts['autoTime'] ) helper.renderTimeout();
      }
    },

    _initSwiping : function() {
      var update = function(event, phase, direction, distance, duration, fingerCount) {
        // Prevent to drag the image when event target equals navigation's arrow or bullets.
        var t = $( event.target ), p = t.parent(), a = 'arrow', b = 'bullets';
        if ( p.hasClass(a) || p.hasClass(b) || t.hasClass(a) ||  t.hasClass(b) ) {
          return opts['isMobile'] ? true : 
            ( (! opts['ie'] || opts['ie'] > 8) ? false : opts['main'].mouseup() );
        }

        helper.stop();
        if ( phase == 'start' ) opts['left'] = parseInt( opts['slider'].css('left') );

        return direction == 'left' || direction == 'right' ? helper.adjustSlider({ 
          'event'   : event,    'phase'   : phase,    'direction'  : direction,
          'distance': distance, 'duration': duration, 'fingerCount': fingerCount
        }) : null;
      };

      // Touch event: 
      // touchstart, touchend, touchcancel, touchleave, touchmove
      if ( opts['isMobile'] )
        opts['main'].swipe({'triggerOnTouchEnd': true, 'swipeStatus': update});
      else {
        var pin = [], move = function( e, s ) {
          e.preventDefault();
          if ( s == 'start' ) 
            pin = [e.clientX, e.clientX];
          else
            pin[1] = e.clientX;

          var phase     = s || 'move';
          var direction = pin[0] > pin[1] ? 'left' : 'right';
          var distance  = pin[0] > pin[1] ? pin[0]-pin[1] : pin[1]-pin[0];

          update( e, phase, direction, distance );
          if ( phase == 'end' ) pin = [];
        }, grab = function( e ) {
          var type = e.type;
          if ( type == 'mousedown' && pin[0] == null ) {
            move(e, 'start'), $('body').bind('mousemove', move).bind('mouseup', grab);
          }
          else if ( type == 'mouseup' ) {
            move(e, 'end'), $('body').unbind('mousemove', move).unbind('mouseup', grab); 
          }        
        };
        opts['main'].bind( 'mousedown', grab).disableSelection();
      }
    },

    _initImageOption : function() {
      var index    = opts['atIndex'], data = config['data'], atLeast = null;
      var delay    = data && data[index] && data[index]['src'] ? {} : null;
      var interval = helper.getLoadingInterval();

      opts['images'] = data ? $( $.map( data, function( d, i ) {
        var s = d['src'], t = d['text'];
        if ( ! s && ! t ) return;

        var n = ! s ? '<div class="text">'+t+'</div>' : 
          '<img src="'+d['src']+'" alt="'+(d['alt']||'')+'">' +
          '<div class="imageText">' + (
            (t instanceof Array) ? $.map( t, function(d,i) {
              return '<div class="text">' + 
                typeof( d ) == 'string' ? d : ( d['n'] || '' )+
              '</div>';
            }).join('') : ('<div class="text">'+t+'</div>')
          ) + '</div>';

        // incremental load test
        var c = $.map(interval, function(v){return v==i ? i : '';}).join('');
        if ( opts['incremental'] && ! c ) {
          opts['waiting'][i] = n, n = '';     
          if ( atLeast == null && s ) atLeast = i; 
        }
        else if ( s ) { 
          atLeast = false;   
          if ( delay && i != index ) { delay[i+''] = n, n = ''; }
        }

        return '<div class="image">'+ n + '</div>';       
      }).join('') ).appendTo( opts['slider'] ) : opts['slider'].find('.image');

      opts['count'] = opts['images'].size();
      if ( typeof(atLeast) == 'number' ) helper.renderLazyload( atLeast ); 

      if ( delay ) { 
        setTimeout( function() { $.each( delay, function(k,v) { 
          opts['images'].eq( parseInt(k) ).append(v); 
        }); }, 500 );
      }
      return opts['count'] > 0;
    },

    _initBulletOption : function() {
      opts['bullets'] = ! opts['bNavigator'] ? null : $(
        '<div class="bullets">' + $.map( opts['images'].toArray(), function(dom,i) {
          var c = 'item' + (i == opts['atIndex'] ? ' active' : '');
          return '<span class="'+c+'"></span>';
        }).join('') + '</div>'
      ).appendTo( opts['main'] ).find( '.item' ).bind( 'click', helper.clickBullet ); 
    },

    _initArrowOption : function() {
      opts['arrows'] = opts['aNavigator'] && opts['count'] > 1 ? 
        opts['main'].append(
          '<div class="arrow left"><div class="bg"></div><div class="fr"></div></div>'+
          '<div class="arrow right"><div class="bg"></div><div class="fr"></div></div>'
        ).find( '.arrow' ).bind( 'click', helper.clickArrow ) : null;
      if ( opts['arrows'] ) opts['main'].addClass('includedArrows');
    },

    _initCarouselOption : function() {
      if ( opts['carousel'] && opts['count'] > 1 ) {
        opts['copies'] = opts['slider'].append(
          opts['images'].eq( 0 ).clone().addClass('copy'), 
          opts['images'].eq( opts['count']-1 ).clone().addClass('copy')
        ).find('.image.copy');
      }
    },

    _initImageCloneOption : function() {
      var cloned = null; img = opts['images'].find('img');
      if ( img.size() )
        cloned = img.eq( 0 ).parent().clone();   
      else { // only text, there 
        var height = 0, pin = 0;
        cloned = opts['images'].each( function(i, dom) {
          var h = $( dom ).prop('offsetHeight');
          if ( height < h ) {  height = h, pin = i; }
        }).eq( pin ).clone();
      }
      opts['slider'].append( cloned.addClass('cloned') );   
    },

    /*************************************************************************
      === Methode ===
    **************************************************************************/
    /**
     * The function 
     * @return {Void}
     */   
    slideComplete: function() {
      if ( opts['bullets'] ) 
        helper.updateBullet( opts['bullets'].eq( opts['atIndex'] ) );

      // Render configuration options
      if ( opts['autoTime']    ) helper.renderTimeout();
      if ( opts['incremental'] ) helper.renderLazyload();
    },

    /**
     * The function .
     * @param index {Integer}
     * @return {Integer}
     */   
    renderLazyload : function( index ) {
      if ( ! opts['incremental'] || ! opts['waiting'] ) return; 
      var interval = index == null ? helper.getLoadingInterval() : [index];
      $.map( interval, function( i ) {
        if ( opts['waiting'][i] ) {
          opts['images'].eq( i ).append( opts['waiting'][i] );

          if ( opts['copies'] )  {
            if ( i==0 || i == (opts['count']-1) ) 
              opts['copies'].eq( i ? 1 : 0 ).append( opts['waiting'][i] );
          }
          opts['waiting'][i] = null;
        }
      });
      if ( ! opts['waiting'].join('') ) opts['waiting'] = null;
    },    

    /**
     * The function .
     * @return {Integer}
     */   
    renderTimeout : function() {
      if ( ! opts['autoTime'] ) return; 

      helper.stop( 'timeout' );
      opts['out'] = setTimeout( function() {
        var index = opts['atIndex'], w = helper.getScreenSize(); 
        var desc  = ! opts['reverse'], next = index + (desc ? 1 : -1);
        var pin   = w * next * (-1); 
        if ( ! opts['carousel'] ) {
          if ( desc ) {
            if ( next == opts['count'] ) desc = false;
          }
          else {
            if ( next < 0 ) {
              desc = true, pin = w * (opts['count']-1) * (-1);
            }
          }
        }
        helper.sliding( pin, desc );
      }, opts['autoTime'] );
    },

    /**
     * The function returns the width size of the main object.
     * @return {Integer}
     */   
    getScreenSize : function() { return opts['main'].prop('offsetWidth'); },

    /**
     * The function returns the width size of the main object.
     * @return {Array}
     */   
    getLoadingInterval : function() {
      var s = opts['incremental'], a = opts['atIndex']; 
      if ( ! s ) return [ a ];

      var c = opts['carousel'] || opts['autoTime'], m = opts['count'], o = [];
      $.each( new Array(s), function(i) {
        var j = a - s + i;
        o.push( c && j < 0 ? m + j : j );         
      });
      o.push( a );
      $.each( new Array(s), function(i) {
        var j = a + i + 1;
        o.push( c && j > (m-1) ? (j-m) : j );         
      });
      return o;
    },

    /**
     * The function verifies all images position according to the screen size.
     * @param width {Integer} size of the main object.
     * @return {Void}
     */   
    verifyImagesLeft : function( width ) {
      var w = width || helper.getScreenSize();
      opts['images'].each( function( i, dom ) {
        $( dom ).css({ 
          'left'     : (w*i)+'px',
          'width'    :  w + 'px',
          'position' : 'absolute'
        });
      });

      if ( opts['copies'] ){
        opts['copies'].each(function(i, dom) {
          $( dom ).css({ 
            'left'     : (w * (i==0 ? opts['count'] : -1) )+'px',
            'width'    :  w + 'px',
            'position' : 'absolute'
          });
        });
      }
    },

    /**
     * The function adjust the current image's position.
     * @param ignor {Boolean}, the true refers to not call methode 
     *        verifyAtIndexLeft.
     * @return {Void}
     */   
    verifyAtIndexLeft : function( ignor ) {
      var w = helper.getScreenSize();
      opts['left'] = - (w * opts['atIndex']);
      opts['slider'].css('left', opts['left']+'px');      
      if ( ignor != true ) helper.verifyImagesLeft( w );
    },

    /**
     * The function interval updates pixel of slider's left until
     * the pixel is great/low then pin.
     * @param pin {Integer}.
     * @param desc {Boolean}, true refers to decrease slider's left pixel,
     *        Otherwise it'll increase slider's left pixel.
     * @return {Void}
     */
    sliding : function( pin, desc ) {
      helper.stop(); opts['onSlide'] = true;

      if ( opts['ie'] && opts['ie'] < 10 ) {
        var w = desc ? (opts['left']-pin) : (pin-opts['left']);
        opts['move'] = { 'left' : (desc ? ('-='+w) : ('+='+w))+'px' };

        opts['slider'].animate( opts['move'], {
          'duration': opts['duration'], 'complete':function() {
            helper.completeSliding( pin ); 
          }
        });
      }
      else {
        if ( ! opts['slider'].hasClass('binddedTransitionend') ) {
          var handler = 'transitionend webkitTransitionEnd '+
            'oTransitionEnd otransitionend MSTransitionEnd';
          opts['slider'].bind( handler, function() {
            helper.completeSliding();
          }).addClass('binddedTransitionend');
        }

        opts['slider'].css({
          '-ms-transition-duration'     : opts['second']+'s',
          '-o-transition-duration'      : opts['second']+'s',
          '-moz-transition-duration'    : opts['second']+'s',
          '-webkit-transition-duration' : opts['second']+'s',
          'left'                        : pin+'px'
        });
      }
    },

    /**
     * The function stops the move.
     * @param pin {Integer}.
     * @return {Void}
     */
    completeSliding : function( pin ) {
      if ( ! pin ) pin = parseInt( opts['slider'].css('left'), 10 );
      opts['slider'].attr('style', pin+'px');
      opts['onSlide'] = false;
      opts['atIndex'] = parseInt( (pin / helper.getScreenSize()) * -1 ); 
      if ( opts['atIndex'] < 0  || opts['atIndex'] >= opts['count'] )
        opts['atIndex'] = opts['atIndex'] < 0 ? opts['count']-1 : 0;
      helper.verifyAtIndexLeft( true ), helper.slideComplete();
    },

    /**
     * The function stops the move and waiting time for displaying of next image.
     * @param action {String}, as 'animate' refers to stop the move of image,
     *        as 'timeout' to stop the waiting time. The default as null stops
     *         the both actions.
     * @return {Void}
     */
    stop : function( action ) {
      if ( action == null || action == 'timeout' ) clearTimeout( opts['out'] );
      if ( action == null || action == 'animate' ) { 
        opts['ie'] && opts['ie'] < 10 ? opts['slider'].stop() :
          opts['slider'].attr('style', 'left:'+opts['slider'].css('left') );
        opts['onSlide'] = false;
      }
    },

    /**
     * The function calculates slider left according to data information.
     * @param data {hash}
     * @return {Void}
     */
    adjustSlider : function( data ) {
      var r = data['direction'] == 'right';
      var w = helper.getScreenSize(), m = [-(w*(opts['count']-1)), 0], d = 50;
      var v = opts['left'] - (r ? -data['distance'] : data['distance']);
      
      if ( data['phase'] == 'end' || data['phase'] == 'cancel' ) {
        opts['left'] = parseInt( opts['slider'].css('left') );

        var check = (opts['atIndex']==0 && r ) ||
          (opts['atIndex']==opts['count']-1 && ! r);

        if ( opts['carousel'] && check ) {
          var o = parseInt((v % w) * -1);
          if ( o < 0 ) o *= -1; // absolute value         
          if ( ((o * 100 ) / w) > opts['distance'] ) {
            r ? helper.sliding( w, false ) :
              helper.sliding(  (w*opts['count'])*-1, true );  
          }
          else { 
            if ( opts['left'] > m[1] )      { helper.sliding( m[1], true );  }
            else if ( opts['left'] < m[0] ) { helper.sliding( m[0], false ); }
          }
        }
        else {
          if ( opts['left'] > m[1] )      { helper.sliding( m[1], true );  }
          else if ( opts['left'] < m[0] ) { helper.sliding( m[0], false ); }
          else { 
            var o = parseInt((v % w) * -1);
            var g = [v + o, v - (w-o) ];
            if ( ((o * 100 ) / w) > opts['distance'] ) {
              r ? helper.sliding( g[0], false ) : helper.sliding( g[1], true );
            }
            else { helper.sliding( g[0], false ); }
          }
        }
      }
      else if ( (v >= (m[0]-d) && v <= (m[1]+d)) || opts['carousel'] ) { 
        opts['slider'].css('left', v+'px'); 
      }
    },

    /**
     * The function updates the bullets active mode.
     * @param target {jQuery.Object} as current bullet.
     * @return {Void}
     */   
    updateBullet : function ( target ) {
      if ( target && opts['bullets'] ) 
        opts['bullets'].removeClass('active'); target.addClass('active');
    },

    /**
     * The function as handler by clicking of the bullet to navigate the images.
     * @param e {window.Event}.
     * @return {Void}
     */   
    clickBullet : function( e ) {
      if ( opts['onSlide'] || ! opts['bullets'] ) return;
      var t = $( e.currentTarget ), index = opts['bullets'].index( t );
      var pin = (helper.getScreenSize() * index) * (-1);
      opts['left'] = parseInt( opts['slider'].css('left') );
      helper.sliding( pin, pin<=opts['left'] );
    },

    /**
     * The function as handler by clicking of the arrow to navigate the images.
     * @param e {window.Event}.
     * @return {Void}
     */   
    clickArrow : function( e ) {
      if ( opts['onSlide'] ) return;
      var t     = $( e.currentTarget );   
      var next  = t.hasClass('right'), index = opts['atIndex'];
      var check = (! next && ! index) || (next && index+1 == opts['count']);
      if ( ! opts['carousel'] && check ) return;
  
      var pin = (helper.getScreenSize() * (index+(next ? 1 : -1))) * (-1);
      helper.sliding( pin, next );
    }
  };
  helper.init();
  return this;
}
})( jQuery );