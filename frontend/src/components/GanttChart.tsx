import { useEffect, useRef } from 'react'
import { gantt } from 'dhtmlx-gantt'
import 'dhtmlx-gantt/codebase/dhtmlxgantt.css'

interface GanttChartProps {
  tasks: any[]
}

export default function GanttChart({ tasks }: GanttChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    // Enable dhtmlx-gantt plugins
    gantt.plugins({
      critical_path: true,
      tooltip: true
    })

    // Configure Gantt chart
    gantt.config.date_format = "%Y-%m-%d"
    gantt.config.highlight_critical_path = true
    gantt.config.columns = [
      { name: "text", label: "Task Name", tree: true, width: 200 },
      { name: "start_date", label: "Start Date", align: "center", width: 90 },
      { name: "duration", label: "Duration (Days)", align: "center", width: 60 }
    ]

    gantt.init(containerRef.current)

    // Convert tasks into flat array for dhtmlx-gantt format
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

    gantt.parse({ data: formattedData, links: [] })

    return () => {
      gantt.clearAll()
    }
  }, [tasks])

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div ref={containerRef} style={{ width: '100%', height: '400px' }} />
    </div>
  )
}
