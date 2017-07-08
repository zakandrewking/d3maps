/**
 * TimeSeriesBar
 *
 */

var utils = require('./utils')
var CallbackManager = require('./CallbackManager')
var _ = require('underscore')
var data_styles = require('./data_styles.js')
var d3_scale = require('d3-scale')
var d3_interpolate = require("d3-interpolate")

var TimeSeriesBar = utils.make_class()


// TODO: get rid of global variables
var tab_container, reaction_tab_button, metabolite_tab_button, both_tab_button
var typeOfData
var current

//var reaction_tab, metabolite_tab, both_tab


// instance methods
TimeSeriesBar.prototype = {
  init: init,
  update: update,
  is_visible: is_visible,
  toggle: toggle,
  next: next,
  previous: previous,
  toggleDifferenceMode: toggleDifferenceMode,
  showDifferenceData: showDifferenceData,
  setTypeOfData: setTypeOfData,
  openTab: openTab
}
module.exports = TimeSeriesBar

function init (sel, map, builder) {

  this.builder = builder

  var duration = 2000
  var interpolation = false
  this.playing = false

  this.builder.difference_mode = false
  this.builder.reference = 0
  this.builder.target = 0

  current = 0

  typeOfData = ''

  var container = sel.attr('class', 'search-container')
  // TODO: remove this comment in final version
  .style('display', 'block');

  container.append('button')
    .attr('class', 'btn btn-sm btn-default close-button')
    .on('click', function () {
      this.toggle(false)
    }.bind(this))
    .append('span')
    .attr('class', 'glyphicon glyphicon-remove')

  var box = container.append('div')
    .attr('class', 'settings-box')

  // tabbed layout

  // three buttons
  reaction_tab_button = box.append('button')
    .on('click', function (builder) {
      openTab('reaction_tab', builder)
    })
    .style('background-color', 'lightgrey')
    .style('width', '33.3%')
    .text('reaction data')

  metabolite_tab_button = box.append('button')
    .on('click', function (builder) {
      openTab('metabolite_tab', builder)
    })
    .style('background-color', 'lightgrey')
    .style('width', '33.3%')

    .text('metabolite data')

  both_tab_button = box.append('button')
    .on('click', function (builder) {
      openTab('both_tab', builder)
    })
    .style('background-color', 'lightgrey')
    .style('width', '33.3%')
    .text('both data')

  var second_row_buttons = box.append('div')

  var time_series_button = second_row_buttons.append('button')
    .on('click', function () {
      time_series_button.style('background-color', 'white')
      difference_mode_button.style('background-color', 'lightgrey')
      toggleDifferenceMode (builder)
      groupButtons.style('display', 'block')

    })
    .style('background-color', 'white')
    .style('width', '50%')
    .text('Sliding Window')

  var difference_mode_button = second_row_buttons.append('button')
    .on('click', function (builder) {
      time_series_button.style('background-color', 'lightgrey')
      difference_mode_button.style('background-color', 'white')
      toggleDifferenceMode (builder)
      groupButtons.style('display', 'none')
    })
    .style('background-color', 'lightgrey')
    .style('width', '50%')
    .text('Difference Mode')

  tab_container = box.append('div')
    //.style('padding', '0.5em')
    //.style('border', '1px solid lightgrey')
    //.style('display', 'none')

  // three divs
  // reaction_tab = tab_container.append('div')
  //   .attr('id', 'reaction_tab')
  //   .attr('class', 'tab')
  //   .text('compare reaction data')
  //   .style('display', 'none')
  //
  // metabolite_tab = tab_container.append('div')
  //   .attr('id', 'metabolite_tab')
  //   .attr('class', 'tab')
  //   .text('compare metabolite data')
  //   .style('display', 'none')
  //
  // both_tab = tab_container.append('div')
  //   .attr('id', 'both_tab')
  //   .attr('class', 'tab')
  //   .text('compare both')
  //   .style('display', 'none')


  // tab_container.append('div')
  //   .append('text')
  //   .attr('id', 'referenceText')
  //   .text('Reference Data Set: ')

  tab_container.append('select')
    .attr('name', 'target-list')
    .attr('id', 'dropDownMenuReference')
    .on('change', function (builder) {

      builder.reference = this.value
      d3.select('#sliderReference').property('value', this.value)
      d3.select('#referenceText').text('Reference Data Set: ' + this.value)

      if(builder.difference_mode){
        showDifferenceData(builder)
      } else {
        builder.set_data_indices(typeOfData, builder.reference)
      }

    })

  tab_container.append('div').append('input')
    .attr('id', 'sliderReference')
    .attr('type', 'range')
    .attr('value', 0)
    .attr('min', 0)
    .attr('max', 0)
    .on('change', function (builder) {
      builder.reference = this.value
      d3.select('#dropDownMenuReference').property('selectedIndex', this.value)
      d3.select('#referenceText').text('Reference Data Set: ' + this.value)
      if(builder.difference_mode){
      showDifferenceData(builder)
      } else {
        builder.set_data_indices(typeOfData, builder.reference)
      }
    })

  tab_container.append('select')
    .attr('name', 'target-list')
    .attr('id', 'dropDownMenuTarget')
    .on('change', function () {

      builder.target = this.value
      d3.select('#sliderTarget').property('value', this.value)
      d3.select('#targetText').text('Target Data Set ' + this.value)

      if(builder.difference_mode){
        showDifferenceData(builder)
      } else {
        // builder.set_data_indices(typeOfData, builder.get_target())
      }

    })

  tab_container.append('div').append('input')
    .attr('type', 'range')
    .attr('id', 'sliderTarget')
    .attr('value', 0)
    .attr('min', 0)
    .attr('max', 0)
    .on('change', function (builder) {

      builder.target = this.value
      d3.select('#dropDownMenuTarget').property('selectedIndex', this.value)
      d3.select('#targetText').text('Target Data Set ' + this.value)

      if(builder.difference_mode){
        showDifferenceData(builder)
      } else {
     //   builder.set_data_indices(typeOfData, builder.get_target())
      }
    })



  var groupButtons = tab_container.append('div')//.attr('class', 'btn-group btn-group-sm')

  groupButtons.append('div')
    .attr('id', 'counter')
    .attr('class', 'select-counter')
    .text('Display Dataset: 0 / 0')

  groupButtons.append('button')
    .attr('class', 'btn btn-default')
    .on('click', this.previous.bind(this))
    .append('span').attr('class', 'glyphicon glyphicon-step-backward')

  groupButtons.append('button')
    .attr('class', 'btn btn-default')
    .on('click', this.next.bind(this))
    .append('span').attr('class', 'glyphicon glyphicon-step-forward')

  groupButtons.append('button')
    .attr('class', 'btn btn-default')
    .attr('id', 'play_button')
    .on('click', function(){
      play_time_series(builder, duration, interpolation , 10) // TODO: make ui for setting steps
    })
    .append('span').attr('class', 'glyphicon glyphicon-play')


  groupButtons.append('label')
    .attr('for', 'inputDuration')
    .text('Duration in ms')

  groupButtons
    .append('input')
    .attr('id', 'inputDuration')
    .attr('type', 'number')
    .attr('min', 10)
    .attr('value', 2000)

    .on('input', function () {
        duration = this.value
      })


  groupButtons.append('div')

  groupButtons
    .append('input')
    .attr('type', 'checkbox')
    .attr('id', 'checkBoxInterpolation')
    .attr('value', 'Interpolate Data')
    .text('Difference Mode')
    .on('change', function () {
         if (d3.select('#checkBoxInterpolation').property('checked')) {
           interpolation = true
         } else {
            interpolation = false
         }})


  groupButtons.append('label')
    .attr('for', 'checkBoxInterpolation')
    .text('Interpolate Data')

  groupButtons.append('div')


  groupButtons
    .append('input')
    .attr('type', 'checkbox')
    .attr('id', 'checkBoxChart')
    .attr('value', 'Show Chart')
    .text('Show Chart')
    .on('change', function () {
      if (d3.select('#checkBoxChart').property('checked')) {
        create_chart(builder)
        toggle_chart(true)
      } else {
        toggle_chart(false)
      }})

  groupButtons.append('label')
    .attr('for', 'checkBoxChart')
    .text('Show Chart')


  container.append('div')
    .attr('id', 'div_data_chart')
    .append('svg')
    .attr('id', 'data_chart')
    .attr('display','block')



  container.append('label')
    .attr('id', 'div_data_chart_labels')
    .attr('display','block')
    .text('Lines:')




  // groupButtons.append('button')
  //   .attr('class', 'btn btn-default')
  //   .on('click', this.update.bind(this))
  //   .append('span').attr('class', 'glyphicon glyphicon-refresh')

  //container.append('hr')
  //
  // checkBoxDifferenceMode = container.append('div')
  //   .append('label')
  //   .attr('for', 'checkBoxDifferenceMode')
  //   .text('Difference Mode')
  //   .append('input')
  //   .attr('type', 'checkbox')
  //   .attr('id', 'checkBoxDifferenceMode')
  //   .attr('value', 'Difference Mode')
  //   .text('Difference Mode')
  //   .on('change', function () {
  //     if (checkBoxDifferenceMode.property('checked')) {
  //       builder.set_difference_mode(true)
  //       containerDifferenceMode.style('display', 'block')
  //     } else {
  //       builder.set_difference_mode(false)
  //       containerDifferenceMode.style('display', 'none')
  //     }
  //   })


  // var containerDifferenceMode = container.append('div')
  //   .style('display', 'none')
  //
  //
  //
  // initDifferenceMode(containerDifferenceMode)

  // containerDifferenceMode.append('div').append('button')
  //   .attr('class', 'btn btn-default')
  //   .on('click', this.showDifferenceData.bind(this))
  //   .append('span')//.attr('class', 'glyphicon glyphicon-play')
  //   .text('Compare')

  create_chart(builder)


  this.callback_manager = new CallbackManager()

  this.selection = container
  this.map = map
}


// TODO: I need only one tab
function openTab (tab_id, builder) {

  tab_container.style('display', 'block')

  reaction_tab_button.style('background-color', 'lightgrey')
  metabolite_tab_button.style('background-color', 'lightgrey')
  both_tab_button.style('background-color', 'lightgrey')

  var tabs = document.getElementsByClassName('tab')

  for (var i = 0; i < tabs.length; i++) {
    tabs[i].style.display = 'none'
  }

  if (tab_id === 'reaction_tab') {
    setTypeOfData('reaction')
    reaction_tab_button.style('background-color', 'white')
    //reaction_tab.style('display', 'block')
    update(builder)
  } else if (tab_id === 'gene_tab') {
    setTypeOfData('gene')
    reaction_tab_button.style('background-color', 'white')
    //reaction_tab.style('display', 'block')
    update(builder)
  } else if (tab_id === 'metabolite_tab') {
    setTypeOfData('metabolite')
    metabolite_tab_button.style('background-color', 'white')
    //metabolite_tab.style('display', 'block')
    update(builder)
  }
  else if (tab_id === 'both_tab') {
    //both_tab.style('display', 'block')
    both_tab_button.style('background-color', 'white')
    update(builder)
  } else {
// ?
  }

}


/**
 *  Update the GUI
 *
 * set to specific dataset
 * set slider to max of data
 * set counter to 0 of data length
 * set dropdown menu length
 *
 */

function update (builder, should_create_chart) {

  var currentDataSet
  var data_set_loaded = false

  if (typeOfData === 'reaction' && builder.options.reaction_data !== null) {
    currentDataSet = builder.options.reaction_data
    data_set_loaded = true
  } else if (typeOfData === 'gene' && builder.options.gene_data !== null) {
    currentDataSet = builder.options.gene_data
    data_set_loaded = true
  } else if (typeOfData === 'metabolite' && builder.options.metabolite_data !== null) {
    currentDataSet = builder.options.metabolite_data
    data_set_loaded = true
  }
  // TODO: 'both' or not loaded?


  if (data_set_loaded) {
    // update display
    current = 0
    d3.select('#counter').text('Display Dataset: '+ (current + 1) + ' / ' + currentDataSet.length)

    // update slider
    d3.select('#sliderReference')
      .attr('max', (currentDataSet.length - 1))
      .attr('value', 0)

    d3.select('#sliderTarget')
      .attr('max', (currentDataSet.length - 1))
      .attr('value', 0)

    d3.select('#referenceText').text('Reference Data Set: ' + current)
    d3.select('#targetText').text('Target Data Set: ' + current)

    // reset dropdown menu

    document.getElementById('dropDownMenuReference').options.length = 0
    document.getElementById('dropDownMenuTarget').options.length = 0

    for (var x in currentDataSet) {

      var name_of_current_data_set = x

      if (typeOfData === 'reaction') {
        name_of_current_data_set = builder.reaction_data_names[x]

      } else if (typeOfData === 'metabolite') {
        name_of_current_data_set = builder.metabolite_data_names[x]

      } else if(typeOfData === 'gene'){
        name_of_current_data_set = builder.gene_data_names[x]
      }

      d3.select('#dropDownMenuReference').append('option').attr('value', x).text('Reference Data Set: ' + name_of_current_data_set)
      d3.select('#dropDownMenuTarget').append('option').attr('value', x).text('Target Data Set: ' + name_of_current_data_set)

    }

    if(should_create_chart){
      create_chart(builder)
      //toggle_chart(true)
    }

  } else { // reset everything
    // update display
    current = 0
    d3.select('#counter').text('Display Dataset: 0 / 0')

    // update slider
    d3.select('#sliderReference')
      .attr('max', 0)
      .attr('value', 0)

    d3.select('#sliderTarget')
      .attr('max', 0)
      .attr('value', 0)

    d3.select('#referenceText').text('Reference Data Set: ')
    d3.select('#targetText').text('Target Data Set: ')

    // reset dropdown menu
    document.getElementById('dropDownMenuReference').options.length = 0
    document.getElementById('dropDownMenuTarget').options.length = 0
  }
}

function next (builder) {

  if (typeOfData === 'metabolite') {

    if (builder.options.metabolite_data !== undefined && builder.options.metabolite_data !== null) {
      if (current < builder.options.metabolite_data.length - 1) {
        current += 1
      } else {
        current = 0
      }
        builder.set_data_indices(typeOfData, current)
        d3.select('#counter').text('Display Dataset: ' + (current + 1) + ' / ' + (builder.options.metabolite_data.length))

    }

  } else if (typeOfData === 'reaction') {
    if (builder.options.reaction_data !== undefined && builder.options.reaction_data !== null) {
      if (current < builder.options.reaction_data.length - 1) {
        current += 1
      } else {
        current = 0
      }
        builder.set_data_indices(typeOfData, current)
      d3.select('#counter').text('Display Dataset: ' + (current + 1) + ' / ' + (builder.options.reaction_data.length))

    }
  } else if (typeOfData === 'gene') {
    if (builder.options.gene_data !== undefined && builder.options.gene_data !== null) {
      if (current < builder.options.gene_data.length - 1) {
        current += 1
      } else {
        current = 0
      }
        builder.set_data_indices(typeOfData, current)
      d3.select('#counter').text('Display Dataset: ' + (current + 1) + ' / ' + (builder.options.gene_data.length))

    }

  }
}

function previous (builder) {

  if (current > 0) {

    var current_data

    // this is only for displaying one number... maybe find a work around
    if (typeOfData === 'metabolite' &&
      builder.options.metabolite_data !== undefined &&
      builder.options.metabolite_data !== null) {
      current -= 1

      builder.set_data_indices('metabolite', current)
      d3.select('#counter').text('Display Dataset: ' + (current + 1) + ' / ' + (builder.options.metabolite_data.length))

    } else if (typeOfData === 'reaction' &&
      builder.options.reaction_data !== undefined &&
      builder.options.reaction_data !== null) {
      current -= 1

      builder.set_data_indices('reaction', current)

      d3.select('#counter').text('Display Dataset: ' + (current + 1) + ' / ' + (builder.options.reaction_data.length))

    } else if (typeOfData === 'gene' && builder.options.gene_data !== undefined && builder.options.gene_data !== null) {
      current -= 1

      builder.set_data_indices(typeOfData, current)
      d3.select('#counter').text('Display Dataset: ' + (current + 1) + ' / ' + (builder.options.gene_data.length))

    }

  }
}

function play_time_series (builder, duration, interpolation, max_steps) {

  if(interpolation){

    if(!this.playing){
    this.data_set_to_interpolate = []
    this.data_set_to_interpolate.length = 0

      this.playing = true

      this.sliding_window_start = builder.reference
      this.sliding_window_end = builder.target

    if(typeOfData === 'reaction'){

      this.data_set_save = builder.options.reaction_data
      for(var i = this.sliding_window_start; i <= this.sliding_window_end; i++){
      this.data_set_to_interpolate.push(builder.options.reaction_data[i])
      }

    } else if(typeOfData === 'gene'){

      this.data_set_save = builder.options.gene_data

      for(var i = this.sliding_window_start; i <= this.sliding_window_end; i++){
        this.data_set_to_interpolate.push(builder.options.gene_data[i])
      }
    } else if(typeOfData === 'metabolite'){
      this.data_set_save = builder.options.metabolite_data
      for(var i = this.sliding_window_start; i <= this.sliding_window_end; i++){
        this.data_set_to_interpolate.push(builder.options.metabolite_data[i])
      }
    } else {
     // this.data_set_save = null
     // data_set_to_interpolate = null
    }

      // create new data_set with every data points in between
      // set it to data object in builder
      // set it back after the animation stops

      var set_of_interpolators = []
      set_of_interpolators.length = 0


      for(var index_of_data_set = 0; index_of_data_set < this.data_set_to_interpolate.length - 1; index_of_data_set++){

        var current_object = {}

        for(var index_of_reaction = 0; index_of_reaction < Object.keys(this.data_set_to_interpolate[index_of_data_set]).length; index_of_reaction++){

          var reaction_name = Object.keys(this.data_set_to_interpolate[index_of_data_set])[index_of_reaction]
          var current_object_data = Object.values(this.data_set_to_interpolate[index_of_data_set])[index_of_reaction]

          // choose the same reaction, but in next data set
          var next_object_data = Object.values(this.data_set_to_interpolate[index_of_data_set + 1])[index_of_reaction]

          current_object[reaction_name] =  d3_interpolate.interpolate((current_object_data), (next_object_data))

          }
        set_of_interpolators.push(current_object)
      }


      // fill new data set with all the data
      var interpolation_data_set = []
      interpolation_data_set.length = 0

      // [{key: value, key: value, key: value},
      // {key: value, key: value, key: value}, ...
      // {key: value, key: value, key: value}]

        for (var set in set_of_interpolators) {

          for (var interpolator in set) {

          var steps = 0
          while (steps <= max_steps) {

            var keys = Object.keys(set_of_interpolators[set]) // array of all keys, pick out one
            var interpolators = Object.values(set_of_interpolators[set]) // array of all interpolators, pick out one

            var set_of_entries = {} // this contains data for all reactions at one time point = one 'step' of interpolator
                                    // {key: value, key: value, key: value}

            for (var key in keys) {
              // this creates one single entry name: value
              var identifier = keys[key]
              var current_interpolator_function = interpolators[key]

              set_of_entries[identifier] = current_interpolator_function((steps / 10))

              interpolation_data_set.push(set_of_entries)
            }

            steps++
          }
        }

      }

      if(typeOfData === 'reaction'){
        builder.options.reaction_data = interpolation_data_set
      } else if(typeOfData === 'gene'){
        builder.options.gene_data = interpolation_data_set
      } else if(typeOfData === 'metabolite'){
        builder.options.metabolite_data = interpolation_data_set
      }


      // animation

      // to play animation with all data sets
      this.sliding_window_start = 0
      this.sliding_window_end = interpolation_data_set.length - 1

      this.animation = setInterval(function () {

        d3.select('#counter').text('Interpolated Time Series of Data Sets: '
          + this.sliding_window_start +
          ' to ' + builder.target +
          '. Current: ' + builder.reference)

        if (builder.reference < this.sliding_window_end) {
          var next = builder.reference
          next++
          builder.reference = next
        } else {
          builder.reference = this.sliding_window_start
        }
        builder.set_data_indices(typeOfData, builder.reference, this.sliding_window_end) // otherwise will set to null
      }, (duration / this.sliding_window_end / max_steps))

    } else {

      clearInterval(this.animation)

      this.playing = false

      this.data_set_to_interpolate = []
      this.data_set_to_interpolate.length = 0

      // after animation reset to 'normal' data
      if (typeOfData === 'reaction') {
        builder.options.reaction_data = this.data_set_save
      } else if (typeOfData === 'gene') {
        builder.options.gene_data = this.data_set_save
      } else if (typeOfData === 'metabolite') {
        builder.options.metabolite_data = this.data_set_save
      }

      builder.reference = this.sliding_window_start
      builder.target = this.sliding_window_end

    }


  } else {

    // TODO: makes crazy stuff with setting reference / target every time. maybe just grey out while animation?

    if (!this.playing) {
      this.playing = true
      this.sliding_window_start = builder.reference
      this.sliding_window_end = builder.target

      // save values for later, because reference gets overwritten in set indices
      this.animation = setInterval(function () {

        d3.select('#counter').text('Time Series of Data Sets: '
          + this.sliding_window_start +
          ' to ' + builder.target +
          '. Current: ' + builder.reference)

        if (builder.reference < this.sliding_window_end) {
          var next = builder.reference
          next++
          builder.reference = next
        } else {
          builder.reference = this.sliding_window_start
        }

        builder.set_data_indices(typeOfData, builder.reference, this.sliding_window_end) // otherwise will set to null
      }, duration / this.sliding_window_end);

    } else {
      clearInterval(this.animation)

      this.playing = false
      builder.reference = this.sliding_window_start
      builder.target = this.sliding_window_end
    }
  }
}



function toggleDifferenceMode (builder) {

  if (builder.difference_mode) {
    builder.difference_mode = false
    builder.reference = 0
    builder.target = 0
  } else {
    builder.difference_mode = true
  }

}

function showDifferenceData (builder) {
  builder.difference_mode = true
  builder.set_data_indices(typeOfData, builder.reference, builder.target)
}

function is_visible () {
  return this.selection.style('display') !== 'none'
}

function toggle (on_off) {
  if (on_off === undefined) this.is_active = !this.is_active
  else this.is_active = on_off

  if (this.is_active) {
    this.selection.style('display', null)
    //container.style('display', 'block')

    this.clear_escape = this.map.key_manager
      .add_escape_listener(function() {
        this.toggle(false);
      }.bind(this), true);

    // TODO: run the show callback. why?
    //this.callback_manager.run('show')

  } else {

    // TODO: reset all data here?
    this.map.highlight(null)

    // TODO: set this to 'none'
    this.selection.style('display', 'block')

   // container.style('display', 'none')

    // TODO: run the show callback. why?
    // this.callback_manager.run('hide')
  }

}

function setTypeOfData (data) {
  typeOfData = data
}


function create_chart(builder){

  var current_data_set
  var current_data_set_names
  var data_set_loaded = false

  if (typeOfData === 'reaction' && builder.options.reaction_data !== null) {
    current_data_set = builder.options.reaction_data
    current_data_set_names = builder.reaction_data_names
    data_set_loaded = true
  } else if (typeOfData === 'gene' && builder.options.gene_data !== null) {
    current_data_set = builder.options.gene_data
    current_data_set_names = builder.gene_data_names

    data_set_loaded = true
  } else if (typeOfData === 'metabolite' && builder.options.metabolite_data !== null) {
    current_data_set = builder.options.metabolite_data
    current_data_set_names = builder.metabolite_data_names

    data_set_loaded = true
  }

  if(data_set_loaded){

    var width = 300
    var height = 150
    var margins = {
        top: 20,
        right: 20,
        bottom: 20,
        left: 50
      }

    var data_chart = d3.select("#data_chart")
    var color = d3_scale.schemeCategory20

    var data_for_lines = []
    var labels_for_lines = Object.keys(current_data_set[0])

    // for all data keys create chart data

    for(var k in Object.keys(current_data_set[0])){ // for each key

      var data_for_line = []

      // save identifier for label
      //labels_for_lines.push(key)

      for(var index in current_data_set){ // go though all data sets to collect values
        var data_point = {}
        var key = Object.keys(current_data_set[index])[k]

        // y is values, x is index TODO: tx how ?

        var y_value = current_data_set[index][key]

        data_point['x'] = index
        data_point['y'] = y_value

        data_for_line.push(data_point)

      }


      data_for_lines.push(data_for_line)

    }

    var domain_x_scale_min = 0
    var domain_x_scale_max = current_data_set.length - 1

    var domain_y_scale_min = d3.min(Object.values(data_for_lines[0][0]))
    var domain_y_scale_max = d3.max(Object.values(data_for_lines[0][0]))

    // TODO: google a better way
    for(var o in data_for_lines){
      for(var p in data_for_lines[o]){
      var curr_min = d3.min(Object.values(data_for_lines[o][p]))
      if(curr_min < domain_y_scale_min){
        domain_y_scale_min = curr_min
      }
      var curr_max = d3.max(Object.values(data_for_lines[o][p]))

      if(curr_max > domain_y_scale_max){
        domain_y_scale_max = curr_max

      }

      }
    }

    var x_scale = d3.scale.linear().range([margins.left, width - margins.right]).domain([domain_x_scale_min,domain_x_scale_max])
    var y_scale = d3.scale.linear().range([height - margins.top, margins.bottom]).domain([domain_y_scale_min,domain_y_scale_max])

    var x_axis = d3.svg.axis().scale(x_scale)
    var y_axis = d3.svg.axis().scale(y_scale).orient("left")


    data_chart.append("svg:g")
      .attr("transform", "translate(0," + (height - margins.bottom) + ")")
      .call(x_axis);

    data_chart.append("svg:g")
      .attr("transform", "translate(" + (margins.left) + ",0)")
      .call(y_axis);

    for(var i in data_for_lines){

      var data = data_for_lines[i]

      var line = d3.svg.line()
        .x(function(data) {
          return x_scale(data.x);
        })
        .y(function(data) {
          return y_scale(data.y);
        });

      data_chart.append('svg:path')
        .attr('d', line(data))
        .attr('stroke', color[i])
        .attr('stroke-width', 2)
        .attr('fill', 'none')

      // Add a label with same color as line
      d3.select('#div_data_chart_labels')
        .append('div').append('label')
        .style('color', color[i])
        .text(labels_for_lines[i])


    }
  }

}

function toggle_chart(show){
  if(show){
  d3.select('#div_data_chart').attr('display', 'block')
    d3.select('#div_data_chart_labels').attr('display', 'block')


  } else {
    d3.select('#div_data_chart').attr('display', 'none')
    d3.select('#div_data_chart_labels').attr('display', 'none')

  }

}
