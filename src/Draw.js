/**
 * Draw. Manages creating, updating, and removing objects during d3 data
 * binding.
 *
 * Arguments
 * ---------
 *
 * behavior: An escher.Behavior object.
 * settings: An escher.Settings object.
 *
 * Callbacks
 * ---------
 *
 * draw.callback_manager.run('create_membrane', draw, enter_selection)
 * draw.callback_manager.run('update_membrane', draw, update_selection)
 * draw.callback_manager.run('create_reaction', draw, enter_selection)
 * draw.callback_manager.run('update_reaction', draw, update_selection)
 * draw.callback_manager.run('create_reaction_label', draw, enter_selection)
 * draw.callback_manager.run('update_reaction_label', draw, update_selection)
 * draw.callback_manager.run('create_segment', draw, enter_selection)
 * draw.callback_manager.run('update_segment', draw, update_selection)
 * draw.callback_manager.run('create_bezier', draw, enter_selection)
 * draw.callback_manager.run('update_bezier', draw, update_selection)
 * draw.callback_manager.run('create_node', draw, enter_selection)
 * draw.callback_manager.run('update_node', draw, update_selection)
 * draw.callback_manager.run('create_text_label', draw, enter_selection)
 * draw.callback_manager.run('update_text_label', draw, update_selection)
 *
 */

var utils = require('./utils')
var data_styles = require('./data_styles')
var CallbackManager = require('./CallbackManager').default
var d3_format = require('d3-format').format
var d3_select = require('d3-selection').select
var d3_mouse = require('d3-selection').mouse
var d3_touch = require('d3-selection').touch

var Draw = utils.make_class()
// instance methods
Draw.prototype = {
  init: init,
  create_reaction: create_reaction,
  update_reaction: update_reaction,
  create_bezier: create_bezier,
  update_bezier: update_bezier,
  create_node: create_node,
  update_node: update_node,
  create_text_label: create_text_label,
  update_text_label: update_text_label,
  create_membrane: create_membrane,
  update_membrane: update_membrane,
  create_reaction_label: create_reaction_label,
  update_reaction_label: update_reaction_label,
  create_segment: create_segment,
  update_segment: update_segment
}
module.exports = Draw

function init (behavior, settings, map) {
  this.behavior = behavior
  this.settings = settings
  this.map = map
  this.callback_manager = new CallbackManager()
}

/**
 * Create membranes in the enter_selection.
 * @param {} enter_selection - The D3 enter selection.
 * @returns {} The selection of the new nodes.
 */
function create_membrane (enter_selection) {
  var rect = enter_selection
    .append('rect')
    .attr('class', 'membrane')

  this.callback_manager.run('create_membrane', this, enter_selection)

  return rect
}

/**
 * Update the membrane
 */
function update_membrane (update_selection) {
  update_selection
    .attr('width', function(d){ return d.width; })
    .attr('height', function(d){ return d.height; })
    .attr('transform', function(d){return 'translate('+d.x+','+d.y+')';})
    .style('stroke-width', function(d) { return 10; })
    .attr('rx', function(d){ return 20; })
    .attr('ry', function(d){ return 20; })

  this.callback_manager.run('update_membrane', this, update_selection)
}

/**
 * Create reactions in the enter_selection.
 * @param {} enter_selection - The D3 enter selection.
 * @returns {} The selection of the new nodes.
 */
function create_reaction (enter_selection) {
  // attributes for new reaction group
  var group = enter_selection.append('g')
    .attr('id', function (d) { return 'r' + d.reaction_id })
    .attr('class', 'reaction')
  this.create_reaction_label(group)

  this.callback_manager.run('create_reaction', this, enter_selection)

  return group
}

/**
 * Run on the update selection for reactions.
 * update_selection: The D3.js update selection.
 * scale: A Scale object.
 * cobra_model: A CobraModel object.
 * drawn_nodes: The nodes object (e.g. Map.nodes).
 * defs: The defs object generated by utils.setup_defs() (e.g. Map.defs).
 * has_data_on_reactions: Boolean to determine whether data needs to be drawn.
 */
function update_reaction (update_selection, scale, cobra_model, drawn_nodes,
                          defs, has_data_on_reactions) {
  // Update reaction label
  update_selection.select('.reaction-label-group')
    .call(function(sel) {
      return this.update_reaction_label(sel, has_data_on_reactions)
    }.bind(this))

  // draw segments
  utils.draw_a_nested_object(update_selection, '.segment-group', 'segments', 'segment_id',
                             this.create_segment.bind(this),
                             function(sel) {
                               return this.update_segment(sel, scale, cobra_model,
                                                          drawn_nodes, defs,
                                                          has_data_on_reactions)
                             }.bind(this),
                             function(sel) {
                               sel.remove()
                             })

  // run the callback
  this.callback_manager.run('update_reaction', this, update_selection)
}

/**
 * Draw reaction labels in the enter selection.
 * @param {} enter_selection - The D3 enter selection.
 * @returns {} The selection of the new nodes.
 */
function create_reaction_label (enter_selection, tool) {
  var group = enter_selection
    .append('g')
    .attr('class', 'reaction-label-group')
  group.append('text').attr('class', 'reaction-label label')
  group.append('g').attr('class', 'all-genes-label-group')

  this.callback_manager.run('create_reaction_label', this, enter_selection)

  return group
}

/**
 * Run on the update selection for reaction labels.
 * @param {D3 Selection} update_selection - The D3.js update selection.
 * @param {Boolean} has_data_on_reactions - Whether data needs to be drawn.
 */
function update_reaction_label (update_selection, has_data_on_reactions) {
  const decimal_format = d3_format('.4g')
  const identifiers_on_map = this.settings.get('identifiers_on_map')
  const reaction_data_styles = this.settings.get('reaction_styles')
  const show_gene_reaction_rules = this.settings.get('show_gene_reaction_rules')
  const hide_all_labels = this.settings.get('hide_all_labels')
  const gene_font_size = this.settings.get('gene_font_size')
  const label_mousedown_fn = this.behavior.labelMousedown
  const label_mouseover_fn = this.behavior.labelMouseover
  const label_mouseout_fn = this.behavior.labelMouseout
  const label_touch_fn = this.behavior.labelTouch

  // label location
  update_selection
    .attr('transform', function(d) {
      return 'translate(' + d.label_x + ',' + d.label_y + ')'
    })
    .call(this.behavior.turnOffDrag)
    .call(this.behavior.reactionLabelDrag)

  // update label visibility
  var label = update_selection.select('.reaction-label')
    .attr('visibility', hide_all_labels ? 'hidden' : 'visible')

  if (!hide_all_labels) {
    label
      .text(function (d) {
        var t = d[identifiers_on_map]
        if (has_data_on_reactions &&
            reaction_data_styles.indexOf('text') !== -1) {
          t += ' ' + d.data_string
        }
        return t
      })
      .on('mousedown', label_mousedown_fn)
      .on('mouseover', function (d) {
        label_mouseover_fn('reaction_label', d)
      })
      .on('mouseout', label_mouseout_fn)
      .on('touchend', function (d) {
        label_touch_fn('reaction_label', d)
      })
  }

  var add_gene_height = function (y, i) {
    return y + (gene_font_size * 1.5 * (i + 1))
  }

  // gene label
  var all_genes_g = update_selection.select('.all-genes-label-group')
    .selectAll('.gene-label-group')
    .data(function (d) {
      var show_gene_string = ('gene_string' in d &&
                              d.gene_string !== null &&
                              show_gene_reaction_rules &&
                              (!hide_all_labels) &&
                              reaction_data_styles.indexOf('text') !== -1)
      var show_gene_reaction_rule = ('gene_reaction_rule' in d &&
                                     d.gene_reaction_rule !== null &&
                                     show_gene_reaction_rules &&
                                     (!hide_all_labels))
      if (show_gene_string) {
        // TODO do we ever use gene_string?
        console.warn('Showing gene_string. See TODO in source.')
        return d.gene_string
      } else if (show_gene_reaction_rule) {
        // make the gene string with no data
        var sd = data_styles.gene_string_for_data(d.gene_reaction_rule, null,
                                                  d.genes, null,
                                                  identifiers_on_map, null)
        // add coords for tooltip
        sd.forEach(function (td, i) {
          td.label_x = d.label_x
          td.label_y = add_gene_height(d.label_y, i)
        })
        return sd
      } else {
        return []
      }
    })

  // enter
  var gene_g = all_genes_g.enter()
    .append('g')
    .attr('class', 'gene-label-group')
  gene_g.append('text')
    .attr('class', 'gene-label')
    .style('font-size', gene_font_size + 'px')
    .on('mousedown', label_mousedown_fn)
    .on('mouseover', function (d) {
      label_mouseover_fn('gene_label', d)
    })
    .on('mouseout', label_mouseout_fn)

  // update
  var gene_update = gene_g.merge(all_genes_g)
  gene_update.attr('transform', function (d, i) {
    return 'translate(0, ' + add_gene_height(0, i) + ')'
  })
  // update text
  gene_update.select('text').text(function (d) {
    return d['text']
  })

  // exit
  all_genes_g.exit().remove()

  this.callback_manager.run('update_reaction_label', this, update_selection)
}

/**
 * Create segments in the enter_selection.
 * @param {} enter_selection - The D3 enter selection.
 * @returns {} The selection of the new nodes.
 */
function create_segment (enter_selection) {
  // create segments
  var g = enter_selection
      .append('g')
    .attr('class', 'segment-group')
    .attr('id', function (d) { return 's' + d.segment_id })

  // create reaction arrow
  g.append('path')
    .attr('class', 'segment')

  g.append('g')
    .attr('class', 'arrowheads')

  g.append('g')
    .attr('class', 'stoichiometry-labels')

  this.callback_manager.run('create_segment', this, enter_selection)

  return g
}

/**
 * Update segments in update selection.
 * @param {} -
 * @param {} -
 * @param {} -
 * @param {} -
 * @param {} -
 * @param {} -
 * @return {}
 */
function update_segment (update_selection, scale, cobra_model,
                         drawn_nodes, defs, has_data_on_reactions) {
  const reaction_data_styles = this.settings.get('reaction_styles')
  const should_size = (has_data_on_reactions && reaction_data_styles.indexOf('size') !== -1)
  const should_color = (has_data_on_reactions && reaction_data_styles.indexOf('color') !== -1)
  const no_data_size = this.settings.get('reaction_no_data_size')
  const no_data_color = this.settings.get('reaction_no_data_color')

  // update segment attributes
  const highlight_missing  = this.settings.get('highlight_missing')
  const hide_secondary_metabolites = this.settings.get('hide_secondary_metabolites')
  const primary_r = this.settings.get('primary_metabolite_radius')
  const secondary_r = this.settings.get('secondary_metabolite_radius')
  const object_mouseover_fn = this.behavior.objectMouseover
  const object_mouseout_fn = this.behavior.objectMouseout
  const object_touch_fn = this.behavior.objectTouch
  const get_arrow_size = function (data, should_size) {
    let width = 20
    let height = 13
    if (should_size) {
      height = (data === null ? no_data_size : scale.reaction_size(data))
      // check for nan
      if (isNaN(height)) {
        height = no_data_size
      }
      width = height * 2
    }
    return { width: width, height: height }
  }
  const get_disp = function (arrow_size, reversibility, coefficient, node_is_primary) {
    var arrow_height = ((reversibility || coefficient > 0) ?
                        arrow_size.height : 0)
    var r = node_is_primary ? primary_r : secondary_r
    return r + arrow_height + 10
  }

  // update arrows
  update_selection
    .selectAll('.segment')
    .datum(function () {
      // Concatenate the segment data with the reaction data from its parent node
      return Object.assign({}, this.parentNode.__data__, this.parentNode.parentNode.__data__)
    })
    .style('visibility', function(d) {
      var start = drawn_nodes[d.from_node_id]
      var end = drawn_nodes[d.to_node_id]
      if (hide_secondary_metabolites &&
          ((end['node_type'] === 'metabolite' && !end.node_is_primary) ||
           (start['node_type'] === 'metabolite' && !start.node_is_primary))) {
        return 'hidden'
      }
      return null
    })
    .attr('d', function(d) {
      if (d.from_node_id === null || d.to_node_id === null) {
        return null
      }
      var start = drawn_nodes[d.from_node_id]
      var end = drawn_nodes[d.to_node_id]
      var b1 = d.b1
      var b2 = d.b2
      // if metabolite, then displace the arrow
      if (start['node_type'] === 'metabolite') {
        var arrow_size = get_arrow_size(d.data, should_size)
        var disp = get_disp(arrow_size, d.reversibility,
                            d.from_node_coefficient,
                            start.node_is_primary)
        var direction = (b1 === null) ? end : b1
        start = displaced_coords(disp, start, direction, 'start')
      }
      if (end['node_type'] == 'metabolite') {
        var arrow_size = get_arrow_size(d.data, should_size)
        var disp = get_disp(arrow_size, d.reversibility,
                            d.to_node_coefficient,
                            end.node_is_primary)
        var direction = (b2 === null) ? start : b2
        end = displaced_coords(disp, direction, end, 'end')
      }
      var curve = ('M' + start.x + ',' + start.y + ' ')
      if (b1 !== null && b2 !== null) {
        curve += ('C' + b1.x + ',' + b1.y + ' ' +
                  b2.x + ',' + b2.y + ' ')
      }
      curve += (end.x + ',' + end.y)
      return curve
    })
    .style('stroke', function(d) {
      var reaction_id = this.parentNode.parentNode.__data__.bigg_id
      var show_missing = (highlight_missing &&
                          cobra_model !== null &&
                          !(reaction_id in cobra_model.reactions))
      if (show_missing) {
        return 'red'
      }
      if (should_color) {
        var f = d.data
        return f === null ? no_data_color : scale.reaction_color(f)
      }
      return null
    })
    .style('stroke-width', function(d) {
      if (should_size) {
        var f = d.data
        return f === null ? no_data_size : scale.reaction_size(f)
      } else {
        return null
      }
    })
    .attr('pointer-events', 'visibleStroke')
    .on('mouseover', function (d) {
      const mouseEvent = d3_mouse(this)
      // Add the current mouse position to the segment's datum
      object_mouseover_fn('reaction_object', Object.assign(
        {}, d, {xPos: mouseEvent[0], yPos: mouseEvent[1]}
      ))
    })
    .on('touchend', function (d) {
      const touchEvent = d3_touch(this.parentNode, 0)
      // Add last touch position to the segment's datum
      object_touch_fn('reaction_object', Object.assign(
        {}, d, {xPos: touchEvent[0], yPos: touchEvent[1]}
      ))
    })
    .on('mouseout', object_mouseout_fn)

  // new arrowheads
  var arrowheads = update_selection.select('.arrowheads')
    .selectAll('.arrowhead')
    .data(function (d) {
      var arrowheads = []
      var start = drawn_nodes[d.from_node_id]
      var b1 = d.b1
      var end = drawn_nodes[d.to_node_id]
      var b2 = d.b2
      // hide_secondary_metabolites option
      if (hide_secondary_metabolites &&
          ((end['node_type'] === 'metabolite' && !end.node_is_primary) ||
           (start['node_type'] === 'metabolite' && !start.node_is_primary))) {
        return arrowheads
      }

      if (start.node_type === 'metabolite' &&
          (d.reversibility || d.from_node_coefficient > 0)) {
        var arrow_size = get_arrow_size(d.data, should_size)
        var disp = get_disp(arrow_size, d.reversibility,
                        d.from_node_coefficient,
                        start.node_is_primary)
        var direction = (b1 === null) ? end : b1
        var rotation = utils.to_degrees(utils.get_angle([ start, direction ])) + 90
        var loc = displaced_coords(disp, start, direction, 'start')
        arrowheads.push({
          data: d.data,
          x: loc.x,
          y: loc.y,
          size: arrow_size,
          rotation: rotation,
          show_arrowhead_flux: (((d.from_node_coefficient < 0) === d.reverse_flux) || d.data === 0)
        })
      }

      if (end.node_type === 'metabolite' &&
          (d.reversibility || d.to_node_coefficient > 0)) {
        var arrow_size = get_arrow_size(d.data, should_size)
        var disp = get_disp(arrow_size, d.reversibility,
                        d.to_node_coefficient,
                        end.node_is_primary)
        var direction = (b2 === null) ? start : b2
        var rotation = utils.to_degrees(utils.get_angle([ end, direction ])) + 90
        var loc = displaced_coords(disp, direction, end, 'end')
        arrowheads.push({
          data: d.data,
          x: loc.x,
          y: loc.y,
          size: arrow_size,
          rotation: rotation,
          show_arrowhead_flux: (((d.to_node_coefficient < 0) === d.reverse_flux) || d.data === 0)
        })
      }

      if (d.unconnected_segment_with_arrow) {
        var arrow_size = get_arrow_size(d.data, should_size)
        var direction = end
        var rotation = utils.to_degrees(utils.get_angle([ start, direction ])) + 90
        arrowheads.push({
          data: d.data,
          x: start.x,
          y: start.y,
          size: arrow_size,
          rotation: rotation,
          show_arrowhead_flux: (((d.to_node_coefficient < 0) === d.reverse_flux) || d.data === 0)
        })
      }

      return arrowheads
    })
  arrowheads.enter().append('path')
    .classed('arrowhead', true)
  // update arrowheads
    .merge(arrowheads)
    .attr('d', function(d) {
      return ('M' + [-d.size.width / 2, 0] +
              ' L' + [0, d.size.height] +
              ' L' + [d.size.width / 2, 0] + ' Z')
    }).attr('transform', function(d) {
      return 'translate(' + d.x + ',' + d.y + ')rotate(' + d.rotation + ')'
    }).style('fill', function(d) {
      if (should_color) {
        if (d.show_arrowhead_flux) {
          // show the flux
          var f = d.data
          return f === null ? no_data_color : scale.reaction_color(f)
        } else {
          // if the arrowhead is not filled because it is reversed
          return '#FFFFFF'
        }
      }
      // default fill color
      return null
    }).style('stroke', function(d) {
      if (should_color) {
        // show the flux color in the stroke whether or not the fill is present
        var f = d.data
        return f===null ? no_data_color : scale.reaction_color(f)
      }
      // default stroke color
      return null
    })
  // remove
  arrowheads.exit().remove()

  // new stoichiometry labels
  var stoichiometry_labels = update_selection.select('.stoichiometry-labels')
    .selectAll('.stoichiometry-label')
    .data(function (d) {
      var labels = []
      var start = drawn_nodes[d.from_node_id]
      var b1 = d.b1
      var end = drawn_nodes[d.to_node_id]
      var b2 = d.b2
      var disp_factor = 1.5

      // hide_secondary_metabolites option
      if (hide_secondary_metabolites &&
          ((end['node_type']=='metabolite' && !end.node_is_primary) ||
           (start['node_type']=='metabolite' && !start.node_is_primary))) {
        return labels
      }

      if (start.node_type === 'metabolite' && (Math.abs(d.from_node_coefficient) != 1)) {
        var arrow_size = get_arrow_size(d.data, should_size)
        var disp = disp_factor * get_disp(arrow_size, false, 0, end.node_is_primary)
        var direction = (b1 === null) ? end : b1
        direction = utils.c_plus_c(direction, utils.rotate_coords(direction, 0.5, start))
        var loc = displaced_coords(disp, start, direction, 'start')
        loc = utils.c_plus_c(loc, { x: 0, y: 7 })
        labels.push({
          coefficient: Math.abs(d.from_node_coefficient),
          x: loc.x,
          y: loc.y,
          data: d.data,
        })
      }

      if (end.node_type === 'metabolite' && (Math.abs(d.to_node_coefficient) !== 1)) {
        var arrow_size = get_arrow_size(d.data, should_size)
        var disp = disp_factor * get_disp(arrow_size, false, 0, end.node_is_primary)
        var direction = (b2 === null) ? start : b2
        direction = utils.c_plus_c(direction,
                                   utils.rotate_coords(direction, 0.5, end))
        var loc = displaced_coords(disp, direction, end, 'end')
        loc = utils.c_plus_c(loc, { x: 0, y: 7 })
        labels.push({
          coefficient: Math.abs(d.to_node_coefficient),
          x: loc.x,
          y: loc.y,
          data: d.data,
        })
      }
      return labels
    })

  // add labels
  stoichiometry_labels.enter()
    .append('text')
    .attr('class', 'stoichiometry-label')
    .attr('text-anchor', 'middle')
  // update stoichiometry_labels
    .merge(stoichiometry_labels)
    .attr('transform', function(d) {
      return 'translate(' + d.x + ',' + d.y + ')'
    })
    .text(function(d) {
      return d.coefficient
    })
    .style('fill', function (d) {
      if (should_color) {
        // show the flux color
        var f = d.data
        return f === null ? no_data_color : scale.reaction_color(f)
      }
      // default segment color
      return null
    })

  // remove
  stoichiometry_labels.exit().remove()

  this.callback_manager.run('update_segment', this, update_selection)
}

/**
 * Create beziers in the enter_selection.
 * @param {} enter_selection - The D3 enter selection.
 * @returns {} The selection of the new nodes.
 */
function create_bezier (enter_selection) {
  var g = enter_selection.append('g')
    .attr('id', function (d) { return d.bezier_id })
    .attr('class', function (d) { return 'bezier' })
  g.append('path')
    .attr('class', 'connect-line')
  g.append('circle')
    .attr('class', function (d) { return 'bezier-circle ' + d.bezier })
    .style('stroke-width', String(1) + 'px')
    .attr('r', String(7) + 'px')

  this.callback_manager.run('create_bezier', this, enter_selection)

  return g
}

/**
 * Update beziers in update_selection.
 */
function update_bezier(update_selection, show_beziers, drag_behavior,
                       mouseover, mouseout, drawn_nodes, drawn_reactions) {
  var hide_secondary_metabolites = this.settings.get('hide_secondary_metabolites')

  if (!show_beziers) {
    update_selection.attr('visibility', 'hidden')
    return
  } else {
    update_selection.attr('visibility', 'visible')
  }

  // hide secondary
  update_selection
    .style('visibility', function (d) {
      var seg_data = drawn_reactions[d.reaction_id].segments[d.segment_id]
      var start = drawn_nodes[seg_data.from_node_id]
      var end = drawn_nodes[seg_data.to_node_id]
      if (hide_secondary_metabolites &&
          ((end['node_type'] === 'metabolite' && !end.node_is_primary) ||
           (start['node_type'] === 'metabolite' && !start.node_is_primary))) {
        return 'hidden'
      }
      return null
    })

  // Draw bezier points
  update_selection.select('.bezier-circle')
    .call(this.behavior.turnOffDrag)
    .call(drag_behavior)
    .on('mouseover', mouseover)
    .on('mouseout', mouseout)
    .attr('transform', function (d) {
      if (d.x === null || d.y === null) return ''
      return 'translate(' + d.x + ',' + d.y + ')'
    })

  // Update bezier line
  update_selection
    .select('.connect-line')
    .attr('d', function (d) {
      var segment_d = drawn_reactions[d.reaction_id].segments[d.segment_id]
      var node = d.bezier === 'b1'
        ? drawn_nodes[segment_d.from_node_id]
        : drawn_nodes[segment_d.to_node_id]
      if (d.x === null || d.y === null || node.x === null || node.y === null) {
        return ''
      }
      return 'M' + d.x + ', ' + d.y + ' ' + node.x + ',' + node.y
    })

  this.callback_manager.run('update_bezier', this, update_selection)
}

/**
 * Create nodes in the enter_selection.
 * @param {} enter_selection - The D3 enter selection.
 * @param {} drawn_nodes - The nodes object (e.g. Map.nodes).
 * @param {} drawn_reactions - The reactions object (e.g. Map.reactions).
 * @returns {} The selection of the new nodes.
 */
function create_node (enter_selection, drawn_nodes, drawn_reactions) {
  // create nodes
  var g = enter_selection
      .append('g')
      .attr('class', 'node')
      .attr('id', function (d) { return 'n' + d.node_id })

  // create metabolite circle and label
  g.append('circle')
    .attr('class', function (d) {
      var c = 'node-circle'
      if (d.node_type !== null)
        c += (' ' + d.node_type + '-circle')
      return c
    })

  // labels
  var metabolite_groups = g.filter(function (d) {
    return d.node_type === 'metabolite'
  })

  metabolite_groups.append('text')
    .attr('class', 'node-label label')

  this.callback_manager.run('create_node', this, enter_selection)

  return g
}

/**
 * Run on the update selection for nodes.
 * @param {D3 Selection} update_selection - The D3.js update selection.
 * @param {Scale} scale - A Scale object.
 * @param {Boolean} has_data_on_nodes - Boolean to determine whether data needs to be drawn.
 * @param {Function} mousedown_fn - A function to call on mousedown for a node.
 * @param {Function} click_fn - A function to call on click for a node.
 * @param {Function} mouseover_fn - A function to call on mouseover for a node.
 * @param {Function} mouseout_fn - A function to call on mouseout for a node.
 * @param {D3 Behavior} drag_behavior - The D3.js drag behavior object for the nodes.
 * @param {D3 Behavior} label_drag_behavior - The D3.js drag behavior object for the node labels.
 */
function update_node (update_selection, scale, has_data_on_nodes,
                      mousedown_fn, click_fn, mouseover_fn, mouseout_fn,
                      drag_behavior, label_drag_behavior) {
  // update circle and label location
  var hide_secondary_metabolites = this.settings.get('hide_secondary_metabolites')
  var primary_r = this.settings.get('primary_metabolite_radius')
  var secondary_r = this.settings.get('secondary_metabolite_radius')
  var marker_r = this.settings.get('marker_radius')
  var hide_all_labels = this.settings.get('hide_all_labels')
  var identifiers_on_map = this.settings.get('identifiers_on_map')
  var metabolite_data_styles = this.settings.get('metabolite_styles')
  var no_data_style = { color: this.settings.get('metabolite_no_data_color'),
                        size: this.settings.get('metabolite_no_data_size') }
  var label_mousedown_fn = this.behavior.labelMousedown
  var label_mouseover_fn = this.behavior.labelMouseover
  var label_mouseout_fn = this.behavior.labelMouseout
  var label_touch_fn = this.behavior.labelTouch
  var object_mouseover_fn = this.behavior.objectMouseover
  var object_mouseout_fn = this.behavior.objectMouseout
  var object_touch_fn = this.behavior.objectTouch

  var mg = update_selection
      .select('.node-circle')
    .attr('transform', function(d) {
      return 'translate(' + d.x + ',' + d.y + ')'
    })
    .style('visibility', function(d) {
      return hideNode(d, hide_secondary_metabolites) ? 'hidden' : null
    })
    .attr('r', function(d) {
      if (d.node_type === 'metabolite') {
        var should_scale = (has_data_on_nodes &&
                            metabolite_data_styles.indexOf('size') !== -1)
        if (should_scale) {
          var f = d.data
          return f === null ? no_data_style['size'] : scale.metabolite_size(f)
        } else {
          return d.node_is_primary ? primary_r : secondary_r
        }
      }
      // midmarkers and multimarkers
      return marker_r
    })
    .style('fill', function(d) {
      if (d.node_type === 'metabolite') {
        var should_color_data = (has_data_on_nodes &&
                                 metabolite_data_styles.indexOf('color') !== -1)
        if (should_color_data) {
          var f = d.data
          return f === null ? no_data_style['color'] : scale.metabolite_color(f)
        } else {
          return null
        }
      }
      // midmarkers and multimarkers
      return null
    })
    .call(this.behavior.turnOffDrag)
    .call(drag_behavior)
    .on('mousedown', mousedown_fn)
    .on('click', click_fn)
    .on('mouseover', function (d) {
      if (d.node_type === 'metabolite') {
        const mouseEvent = d3_mouse(this.parentNode)
        // Add current mouse position to the node's datum
        object_mouseover_fn('node_object', Object.assign(
          {}, d, {xPos: mouseEvent[0], yPos: mouseEvent[1]}
        ))
      }
    })
    .on('mouseout', object_mouseout_fn)
    .on('touchend', function (d) {
      if (d.node_type === 'metabolite') {
        touchEvent = d3_touch(this.parentNode, 0)
        // Add the touch position to the node's datum
        object_touch_fn('node_object', Object.assign(
          {}, d, {xPos: touchEvent[0], yPos: touchEvent[1]}
        ))
      }
    })

  // update node label visibility
  var node_label = update_selection
      .select('.node-label')
      .attr('visibility', hide_all_labels ? 'hidden' : 'visible')
  if (!hide_all_labels) {
    node_label
      .style('visibility', function(d) {
        return hideNode(d, hide_secondary_metabolites) ? 'hidden' : null
      })
      .attr('transform', function(d) {
        return 'translate(' + d.label_x + ',' + d.label_y + ')'
      })
      .text(function(d) {
        var t = d[identifiers_on_map]
        if (has_data_on_nodes && metabolite_data_styles.indexOf('text') !== -1)
          t += ' ' + d.data_string
        return t
      })
      .call(this.behavior.turnOffDrag)
      .call(label_drag_behavior)
      .on('mousedown', label_mousedown_fn)
      .on('mouseover', function (d) {
        label_mouseover_fn('node_label', d)
      })
      .on('mouseout', label_mouseout_fn)
  }

  this.callback_manager.run('update_node', this, update_selection)

  function hideNode (d, hide_secondary_metabolites) {
    return (d.node_type === 'metabolite' &&
            hide_secondary_metabolites &&
            !d.node_is_primary)
  }
}

/**
 * Create text labels in the enter_selection.
 * @param {} enter_selection - The D3 enter selection.
 * @returns {} The selection of the new nodes.
 */
function create_text_label (enter_selection) {
  var g = enter_selection.append('g')
      .attr('id', function (d) { return 'l' + d.text_label_id })
      .attr('class', 'text-label')
  g.append('text')
    .attr('class', 'label')

  this.callback_manager.run('create_text_label', this, enter_selection)

  return g
}

function update_text_label (update_selection) {
  var mousedown_fn = this.behavior.textLabelMousedown
  var click_fn = this.behavior.textLabelClick
  var drag_behavior = this.behavior.selectableDrag
  var turn_off_drag = this.behavior.turnOffDrag

  update_selection
    .select('.label')
    .text(function (d) { return d.text })
    .attr('transform', function (d) {
      return 'translate(' + d.x + ',' + d.y + ')'
    })
    .on('mousedown', mousedown_fn)
    .on('click', click_fn)
    .call(turn_off_drag)
    .call(drag_behavior)

  this.callback_manager.run('update_text_label', this, update_selection)
}

function displaced_coords (reaction_arrow_displacement, start, end, displace) {
  utils.check_undefined(arguments, [ 'reaction_arrow_displacement', 'start',
                                     'end', 'displace' ])

  var length = reaction_arrow_displacement
  var hyp = utils.distance(start, end)
  var new_x
  var new_y
  if (!length || !hyp) {
    console.error('Bad value')
  }
  if (displace === 'start') {
    new_x = start.x + length * (end.x - start.x) / hyp
    new_y = start.y + length * (end.y - start.y) / hyp
  } else if (displace === 'end') {
    new_x = end.x - length * (end.x - start.x) / hyp
    new_y = end.y - length * (end.y - start.y) / hyp
  } else {
    console.error('bad displace value: ' + displace)
  }
  return { x: new_x, y: new_y }
}
