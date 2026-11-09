import { BarChart } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';
import { init, use as register } from 'echarts/core';
import { SVGRenderer } from 'echarts/renderers';

/**
 * Only the parts of ECharts the Overview draws (specs/011 research R-004): bar charts with a grid
 * and tooltips, rendered as SVG. Imported dynamically by `echart.tsx`, so it loads on the Overview
 * alone and never on the server.
 */
register([BarChart, GridComponent, TooltipComponent, SVGRenderer]);

export { init };
