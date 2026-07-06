# Sales Analytics Dashboard

## Overview

Sales Analytics Dashboard is an enterprise scenario project designed for sales operation analysis. It is built with Node.js, Express and vanilla JavaScript. The system supports KPI metrics, monthly trend analysis, regional sales ranking, category performance, order filtering, CSV data import, data quality checks and AI-assisted business reporting.

This project is suitable for demonstrating practical skills in data analytics, web backend development, data processing, dashboard design and AI-assisted business intelligence.

## Tech Stack

Frontend: HTML, CSS, JavaScript

Backend: Node.js, Express

Data Source: CSV file

Visualization: Native SVG and CSS-based charts

AI: Optional DeepSeek API; local rule-based report generation is used when no API key is configured

Project Management: npm, Git, GitHub

## Features

User login and role display

Sales KPI metrics: revenue, profit, orders and profit margin

Data filtering by date, region, category, channel and status

Monthly revenue and profit trend chart

Category and regional performance ranking

Order detail table

CSV sales data import

Data quality check

AI-assisted business report generation

## Run Locally

Install dependencies:

```bash
npm install
```

Start the server:

```bash
npm start
```

Open:

```text
http://localhost:3001
```

## Demo Accounts

Sales Manager: admin@example.com / admin123

Data Analyst: analyst@example.com / analyst123

Viewer: viewer@example.com / viewer123

## Data File

Sample sales data is stored in:

```text
data/sales.csv
```

Required CSV columns:

```text
order_id,date,region,city,category,product,customer_type,sales_amount,quantity,discount,profit,channel,status
```

## AI Report

If no DeepSeek API key is configured, the system will automatically use local rule-based report generation so the project can run reliably for demonstration.

To use DeepSeek API, copy `.env.example` to `.env` and fill in:

```env
DEEPSEEK_API_KEY=your_api_key
```
