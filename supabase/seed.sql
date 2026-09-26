-- Deterministic single-organization demo data. Safe to re-run.
insert into public.warehouses(id,name,code,address) values
('10000000-0000-4000-8000-000000000001','Main Warehouse','MAIN','Main warehouse'),
('10000000-0000-4000-8000-000000000002','South Warehouse','SOUTH','South warehouse')
on conflict(id) do nothing;
insert into public.categories(id,name) values
('20000000-0000-4000-8000-000000000001','Raw Materials'),
('20000000-0000-4000-8000-000000000002','Components')
on conflict(id) do nothing;
insert into public.locations(id,warehouse_id,name,short_code,type) values
('30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','Rack A1','A1','storage'),
('30000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','Receiving','REC','receiving'),
('30000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000002','Rack B1','B1','storage')
on conflict(id) do nothing;
insert into public.products(id,name,sku,category_id,unit,reorder_point,default_warehouse_id,default_location_id) values
('40000000-0000-4000-8000-000000000001','Steel Rods','STL-RD-001','20000000-0000-4000-8000-000000000001','pcs',100,'10000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001'),
('40000000-0000-4000-8000-000000000002','Copper Wire','CPR-WR-002','20000000-0000-4000-8000-000000000002','m',50,'10000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000003')
on conflict(id) do nothing;
insert into public.stock_items(id,product_id,warehouse_id,location_id,on_hand,reserved) values
('50000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001',460,20),
('50000000-0000-4000-8000-000000000002','40000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000003',65,15)
on conflict(product_id,warehouse_id,location_id) do nothing;
insert into public.move_history(id,occurred_at,reference,operation,product_id,sku,source,destination,quantity,status,document_id,destination_warehouse_id,destination_location_id) values
('80000000-0000-4000-8000-000000000001',now()-interval '2 days','OPENING-STL-RD-001','Adjustment','40000000-0000-4000-8000-000000000001','STL-RD-001','Initial balance','Main Warehouse / Rack A1',460,'Applied','40000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001'),
('80000000-0000-4000-8000-000000000002',now()-interval '1 day','OPENING-CPR-WR-002','Adjustment','40000000-0000-4000-8000-000000000002','CPR-WR-002','Initial balance','South Warehouse / Rack B1',65,'Applied','40000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000003')
on conflict(id) do nothing;
insert into public.reordering_rules(id,product_id,warehouse_id,location_id,min_qty,max_qty) values
('60000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001',120,700),
('60000000-0000-4000-8000-000000000002','40000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000003',80,300)
on conflict(id) do nothing;
insert into public.receipts(id,receipt_number,vendor,warehouse_id,scheduled_date,reference,status) values
('70000000-0000-4000-8000-000000000001','REC-DEMO-001','Demo Steel Supply','10000000-0000-4000-8000-000000000001',now(),'Seed example','draft') on conflict(id) do nothing;
insert into public.receipt_lines(id,receipt_id,product_id,expected_quantity,received_quantity,unit,location_id) values
('71000000-0000-4000-8000-000000000001','70000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001',20,20,'pcs','30000000-0000-4000-8000-000000000002') on conflict(id) do nothing;
insert into public.deliveries(id,delivery_number,customer,source_warehouse_id,source_location_id,scheduled_date,reference,status) values
('72000000-0000-4000-8000-000000000001','DEL-DEMO-001','Demo Customer','10000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001',now(),'Seed example','draft') on conflict(id) do nothing;
insert into public.delivery_lines(id,delivery_id,product_id,requested_quantity,picked_quantity,packed_quantity) values
('73000000-0000-4000-8000-000000000001','72000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001',5,0,0) on conflict(id) do nothing;
insert into public.internal_transfers(id,transfer_number,source_warehouse_id,source_location_id,destination_warehouse_id,destination_location_id,scheduled_date,status) values
('74000000-0000-4000-8000-000000000001','TRF-DEMO-001','10000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000003',now(),'draft') on conflict(id) do nothing;
insert into public.transfer_lines(id,transfer_id,product_id,quantity) values
('75000000-0000-4000-8000-000000000001','74000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001',10) on conflict(id) do nothing;
insert into public.stock_adjustments(id,adjustment_number,product_id,warehouse_id,location_id,system_quantity,counted_quantity,reason,status) values
('76000000-0000-4000-8000-000000000001','ADJ-DEMO-001','40000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001',460,458,'Demo cycle count','draft') on conflict(id) do nothing;
