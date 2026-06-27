import { useEffect, useRef } from 'react'
import { gantt } from 'dhtmlx-gantt'
import 'dhtmlx-gantt/codebase/dhtmlxgantt.css'

interface GanttChartProps {
  tasks: any[]
}

// Configure Gantt plugins and properties exactly ONCE upon file load
// to prevent multiple-initialization crashes on component remount.
gantt.plugins({
  critical_path: true,
  tooltip: true
})

gantt.config.date_format = "%Y-%m-%d"
gantt.config.highlight_critical_path = true
gantt.config.smart_scales = true
gantt.config.smart_rendering = true
gantt.config.touch = true
gantt.config.touch_drag = true
gantt.config.grid_width = 250
gantt.config.min_column_width = 40
gantt.config.columns = [
  { name: "text", label: "Task", tree: true, width: 150, min_width: 80 },
  { name: "start_date", label: "Start", align: "center", width: 70, min_width: 50 },
  { name: "duration", label: "Days", align: "center", width: 40, min_width: 30 }
]

export default function GanttChart({ tasks }: GanttChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    gantt.init(container)

    // Format tree hierarchy tasks for dhtmlx-gantt
    const formattedData: any[] = []
    
    const flattenAndFormat = (items: any[]) => {
      items.forEach(t => {
        const start = t.start_date || new Date().toISOString().slice(0, 10)
        let duration = 3
        if (t.start_date && t.end_date) {
          const sDate = new Date(t.start_date)
          const eDate = new Date(t.end_date)
          duration = Math.max(1, Math.ceil((eDate.getTime() - sDate.getTime()) / (1000 * 60 * 60 * 24)))
        }
        
        formattedData.push({
          id: t.id,
          text: t.name,
          start_date: start,
          duration: duration,
          parent: t.parent_task_id || undefined,
          progress: t.status === 'completed' ? 1 : t.status === 'in_progress' ? 0.5 : 0,
          open: true,
          color: t.status === 'completed' ? '#2e7d32' : t.status === 'in_progress' ? '#1a237e' : '#888'
        })

        if (t.children && t.children.length > 0) {
          flattenAndFormat(t.children)
        }
      })
    }

    flattenAndFormat(tasks)

    gantt.clearAll()
    gantt.parse({ data: formattedData, links: [] })

    return () => {
      gantt.clearAll()
    }
  }, [tasks])

  return (
    <div ref={containerRef} style={{ width: '100%', height: '400px', minHeight: '40vh' }} />
  )
}
