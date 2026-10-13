import { NextRequest } from "next/server";
import { DatabaseService } from "@/services/database.service";
import { PythonBridgeService } from "@/services/python-bridge.service";
import { apiSuccess, apiError } from "@/utils/response";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string; widgetId: string } }
) {
  try {
    const dashboard = await DatabaseService.getDashboard(params.id);
    if (!dashboard) {
      return apiError(`Dashboard with ID '${params.id}' not found`, "ERR_NOT_FOUND", 404);
    }

    const dataset = await DatabaseService.getDatasetById(dashboard.dataset_id);
    if (!dataset) {
      return apiError(`Dataset with ID '${dashboard.dataset_id}' not found`, "ERR_NOT_FOUND", 404);
    }

    const body = await req.json();
    const { chart_type, dimension, metric, aggregation, title } = body;

    const visualizations = dashboard.visualizations || [];
    const widgetIndex = visualizations.findIndex((w: any) => w.id === params.widgetId);
    if (widgetIndex === -1) {
      return apiError(`Widget '${params.widgetId}' not found in dashboard`, "ERR_NOT_FOUND", 404);
    }

    const currentWidget = visualizations[widgetIndex];
    const targetChartType = chart_type || currentWidget.chart_type;
    const targetX = dimension || currentWidget.x_axis || currentWidget.dimension;
    const targetY = metric || currentWidget.y_axis || currentWidget.metric;
    const targetAgg = aggregation || currentWidget.aggregation || "SUM";
    const targetTitle = title || `${targetY} by ${targetX}`;

    // Recompile widget via Python AI Engine
    const recompiled = await PythonBridgeService.recompileWidget({
      filePath: dataset.storage_path,
      chartType: targetChartType,
      xAxis: targetX,
      yAxis: targetY,
      aggregation: targetAgg,
      title: targetTitle
    });

    const updatedWidget = {
      ...currentWidget,
      chart_type: targetChartType,
      x_axis: targetX,
      y_axis: targetY,
      dimension: targetX,
      metric: targetY,
      aggregation: targetAgg,
      title: targetTitle,
      reason: `Customized by user: ${targetTitle} (${targetAgg} aggregation)`,
      chart_options: recompiled.chart_options || currentWidget.chart_options
    };

    visualizations[widgetIndex] = updatedWidget;
    dashboard.visualizations = visualizations;

    await DatabaseService.updateDashboard(params.id, { visualizations });

    return apiSuccess({ widget: updatedWidget, dashboard });
  } catch (err: any) {
    return apiError(`Failed to update widget: ${err.message}`, "ERR_UPDATE_WIDGET", 500);
  }
}

function computeLayoutGrid(nCharts: number) {
  const spans = [2, 1, 1, 1, 1, 2, 1, 1];
  const grid = [];
  for (let i = 0; i < nCharts; i++) {
    const span = spans[i % spans.length];
    grid.push({
      viz_index: i,
      row: Math.floor(i / 2) + 1,
      col: (i % 2) + 1,
      col_span: span,
      row_span: 1
    });
  }
  return grid;
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; widgetId: string } }
) {
  try {
    const dashboard = await DatabaseService.getDashboard(params.id);
    if (!dashboard) {
      return apiError(`Dashboard with ID '${params.id}' not found`, "ERR_NOT_FOUND", 404);
    }

    const visualizations = (dashboard.visualizations || []).filter(
      (w: any) => w.id !== params.widgetId
    );
    const layout_grid = computeLayoutGrid(visualizations.length);
    dashboard.visualizations = visualizations;
    dashboard.layout_grid = layout_grid;

    await DatabaseService.updateDashboard(params.id, { visualizations, layout_grid });

    return apiSuccess({ removedWidgetId: params.widgetId, dashboard });
  } catch (err: any) {
    return apiError(`Failed to delete widget: ${err.message}`, "ERR_DELETE_WIDGET", 500);
  }
}
